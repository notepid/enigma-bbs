const WebHandlerModule = require('../../../web_handler_module');
const {
    userFromActorId,
    getUserProfileTemplatedBody,
    DefaultProfileTemplate,
    getActorId,
} = require('../../../activitypub/util');
const Endpoints = require('../../../activitypub/endpoint');
const {
    ActivityStreamMediaType,
    WellKnownActivity,
    Collections,
} = require('../../../activitypub/const');
const Config = require('../../../config').get;
const Activity = require('../../../activitypub/activity');
const ActivityPubSettings = require('../../../activitypub/settings');
const Actor = require('../../../activitypub/actor');
const Collection = require('../../../activitypub/collection');
const Note = require('../../../activitypub/note');
const EnigAssert = require('../../../enigma_assert');
const Message = require('../../../message');
const Events = require('../../../events');
const UserProps = require('../../../user_property');

// deps
const _ = require('lodash');
const enigma_assert = require('../../../enigma_assert');
const httpSignature = require('http-signature');
const async = require('async');
const paths = require('path');

exports.moduleInfo = {
    name: 'ActivityPub',
    desc: 'Provides ActivityPub support',
    author: 'NuSkooler, CognitiveGears',
    packageName: 'codes.l33t.enigma.web.handler.activitypub',
};

exports.getModule = class ActivityPubWebHandler extends WebHandlerModule {
    constructor() {
        super();
    }

    init(webServer, cb) {
        this.webServer = webServer;
        enigma_assert(webServer, 'ActivityPub Web Handler init without webServer');

        this.log = webServer.logger().child({ webHandler: 'ActivityPub' });

        Events.addListener(Events.getSystemEvents().NewUserPrePersist, eventInfo => {
            const { user, callback } = eventInfo;
            return this._prepareNewUserAsActor(user, callback);
        });

        this.webServer.addRoute({
            method: 'GET',
            path: /^\/_enig\/ap\/users\/[^/]+$/,
            handler: this._selfUrlRequestHandler.bind(this),
        });

        this.webServer.addRoute({
            method: 'POST',
            path: /^\/_enig\/ap\/users\/.+\/inbox$/,
            handler: (req, resp) => {
                return this._enforceMainKeySignatureValidity(
                    req,
                    resp,
                    (req, resp, signature) => {
                        return this._inboxPostHandler(
                            req,
                            resp,
                            signature,
                            Collections.Inbox
                        );
                    }
                );
            },
        });

        this.webServer.addRoute({
            method: 'POST',
            path: /^\/_enig\/ap\/shared-inbox$/,
            handler: (req, resp) => {
                return this._enforceMainKeySignatureValidity(
                    req,
                    resp,
                    (req, resp, signature) => {
                        return this._inboxPostHandler(
                            req,
                            resp,
                            signature,
                            Collections.SharedInbox
                        );
                    }
                );
            },
        });

        this.webServer.addRoute({
            method: 'GET',
            path: /^\/_enig\/ap\/users\/.+\/outbox(\?page=[0-9]+)?$/,
            //  :TODO: fix me: What are we exposing to the outbox? Should be public only; GET's don't have signatures
            handler: (req, resp) => {
                return this._enforceMainKeySignatureValidity(
                    req,
                    resp,
                    this._outboxGetHandler.bind(this)
                );
            },
        });

        this.webServer.addRoute({
            method: 'GET',
            path: /^\/_enig\/ap\/users\/.+\/followers(\?page=[0-9]+)?$/,
            handler: this._followersGetHandler.bind(this),
        });

        this.webServer.addRoute({
            method: 'GET',
            path: /^\/_enig\/ap\/users\/.+\/following(\?page=[0-9]+)?$/,
            handler: this._followingGetHandler.bind(this),
        });

        this.webServer.addRoute({
            method: 'GET',
            // e.g. http://some.host/_enig/ap/bf81a22e-cb3e-41c8-b114-21f375b61124/note
            path: /^\/_enig\/ap\/[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}\/note$/,
            handler: this._singlePublicNoteGetHandler.bind(this),
        });

        //  :TODO: NYI
        // this.webServer.addRoute({
        //     method: 'GET',
        //     path: /^\/_enig\/authorize_interaction\?uri=(.+)$/,
        //     handler: this._authorizeInteractionHandler.bind(this),
        // });

        return cb(null);
    }

    _enforceMainKeySignatureValidity(req, resp, next) {
        // the request must be signed, and the signature must be valid
        const signature = this._parseAndValidateSignature(req);
        if (!signature) {
            return this.webServer.accessDenied(resp);
        }

        return next(req, resp, signature);
    }

    _parseAndValidateSignature(req) {
        let signature;
        try {
            //  :TODO: validate options passed to parseRequest()
            signature = httpSignature.parseRequest(req);
        } catch (e) {
            this.log.warn(
                { error: e.message, url: req.url, method: req.method },
                'Failed to parse HTTP signature'
            );
            return null;
        }

        //  quick check up front
        const keyId = signature.keyId;
        if (!keyId || !keyId.endsWith('#main-key')) {
            return null;
        }

        return signature;
    }

    _selfUrlRequestHandler(req, resp) {
        this.log.trace({ url: req.url }, 'Request for "self"');

        let actorId = this.webServer.fullUrl(req).toString();
        let sendActor = false;
        if (actorId.endsWith('.json')) {
            sendActor = true;
            actorId = actorId.slice(0, -5);
        }

        // Additionally, serve activity JSON if the proper 'Accept' header was sent
        const accept = req.headers['accept'].split(',').map(v => v.trim()) || ['*/*'];
        const headerValues = [
            ActivityStreamMediaType,
            'application/ld+json',
            'application/json',
        ];
        if (accept.some(v => headerValues.includes(v))) {
            sendActor = true;
        }

        userFromActorId(actorId, (err, localUser) => {
            if (err) {
                this.log.info(
                    { error: err.message, actorId },
                    `No user for Actor ID ${actorId}`
                );
                return this.webServer.resourceNotFound(resp);
            }

            Actor.fromLocalUser(localUser, this.webServer, (err, localActor) => {
                if (err) {
                    return this.webServer.internalServerError(resp, err);
                }

                if (sendActor) {
                    return this._selfAsActorHandler(localUser, localActor, req, resp);
                } else {
                    return this._selfAsProfileHandler(localUser, localActor, req, resp);
                }
            });
        });
    }

    _inboxPostHandler(req, resp, signature, inboxType) {
        EnigAssert(signature, 'Called without signature!');
        EnigAssert(signature.keyId, 'No keyId in signature!');

        const body = [];
        req.on('data', d => {
            body.push(d);
        });

        req.on('end', () => {
            //  Collect and validate the posted Activity
            const activity = Activity.fromJsonString(Buffer.concat(body).toString());
            if (!activity || !activity.isValid()) {
                this.log.error(
                    { url: req.url, method: req.method, inboxType },
                    'Invalid or unsupported Activity'
                );

                return activity
                    ? this.webServer.badRequest(resp)
                    : this.webServer.notImplemented(resp);
            }

            //
            //  Delete is a special beast:
            //  We will *likely* get a 410, 404, or a Tombstone when fetching the Actor
            //  Thus, we need some short circuiting
            //
            if (WellKnownActivity.Delete === activity.type) {
                return this._inboxDeleteActivity(inboxType, signature, resp, activity);
            }

            //  Fetch and validate the signature of the remote Actor
            Actor.fromId(getActorId(activity), (err, remoteActor) => {
                if (err) {
                    return this.webServer.internalServerError(resp, err);
                }

                if (!this._validateActorSignature(remoteActor, signature)) {
                    return this.webServer.accessDenied(resp);
                }

                switch (activity.type) {
                    case WellKnownActivity.Accept:
                        return this._inboxAcceptActivity(resp, activity);

                    case WellKnownActivity.Add:
                        break;

                    case WellKnownActivity.Create:
                        return this._inboxCreateActivity(resp, activity);

                    case WellKnownActivity.Update:
                        {
                            //  Only Notes currently supported
                            const type = _.get(activity, 'object.type');
                            if ('Note' === type) {
                                return this._inboxMutateExistingObject(
                                    inboxType,
                                    signature,
                                    resp,
                                    activity,
                                    this._inboxUpdateObjectMutator.bind(this)
                                );
                            } else {
                                this.log.warn(
                                    `Unsupported Inbox Update for type "${type}"`
                                );
                            }
                        }
                        break;

                    case WellKnownActivity.Follow:
                        // Follow requests are only allowed directly
                        if (Collections.Inbox === inboxType) {
                            return this._inboxFollowActivity(resp, remoteActor, activity);
                        }
                        break;

                    case WellKnownActivity.Reject:
                        return this._inboxRejectActivity(resp, activity);

                    case WellKnownActivity.Undo:
                        //  We only Undo from private inboxes
                        if (Collections.Inbox === inboxType) {
                            //  Only Follow Undo's currently supported
                            const type = _.get(activity, 'object.type');
                            if (WellKnownActivity.Follow === type) {
                                return this._inboxUndoActivity(
                                    resp,
                                    remoteActor,
                                    activity
                                );
                            } else {
                                this.log.warn(`Unsupported Undo for type "${type}"`);
                            }
                        }
                        break;

                    default:
                        this.log.warn(
                            { type: activity.type, inboxType },
                            `Unsupported Activity type "${activity.type}"`
                        );
                        break;
                }

                return this.webServer.notImplemented(resp);
            });
        });
    }

    _inboxAcceptActivity(resp, activity) {
        const acceptWhat = _.get(activity, 'object.type');
        switch (acceptWhat) {
            case WellKnownActivity.Follow:
                return this._inboxAcceptFollowActivity(resp, activity);

            default:
                this.log.warn(
                    { type: acceptWhat },
                    'Invalid or unsupported "Accept" type'
                );
                return this.webServer.notImplemented(resp);
        }
    }

    _inboxCreateActivity(resp, activity) {
        const createWhat = _.get(activity, 'object.type');
        switch (createWhat) {
            case 'Note':
                return this._inboxCreateNoteActivity(resp, activity);

            default:
                this.log.warn(
                    { type: createWhat },
                    'Invalid or unsupported "Create" type'
                );
                return this.webServer.notImplemented(resp);
        }
    }

    _inboxAcceptFollowActivity(resp, activity) {
        // Currently Accept's to Follow's are really just a formality;
        // we'll log it, but that's about it for now
        this.log.info(
            {
                remoteActorId: activity.actor,
                localActorId: _.get(activity, 'object.actor'),
            },
            'Follow request Accepted'
        );
        return this.webServer.accepted(resp);
    }

    _inboxCreateNoteActivity(resp, activity) {
        const note = new Note(activity.object);
        if (!note.isValid()) {
            this.log.warn({ note }, 'Invalid Note');
            return this.webServer.notImplemented();
        }

        const recipientActorIds = note.recipientIds();
        async.forEach(
            recipientActorIds,
            (actorId, nextActorId) => {
                switch (actorId) {
                    case Collection.PublicCollectionId:
                        this._deliverNoteToSharedInbox(activity, note, err => {
                            return nextActorId(err);
                        });
                        break;

                    default:
                        this._deliverNoteToLocalActor(actorId, activity, note, err => {
                            return nextActorId(err);
                        });
                        break;
                }
            },
            err => {
                if (err && err.code !== 'SQLITE_CONSTRAINT') {
                    return this.webServer.internalServerError(resp, err);
                }

                return this.webServer.created(resp);
            }
        );
    }

    _inboxRejectFollowActivity(resp, activity) {
        // A user Rejected our local Actor/user's Follow request;
        // Update the local Collection to reflect this fact.
        const remoteActorId = activity.actor;
        const localActorId = _.get(activity, 'object.actor');

        if (!remoteActorId || !localActorId) {
            return this.webServer.badRequest(resp);
        }

        userFromActorId(localActorId, (err, localUser) => {
            if (err) {
                return this.webServer.resourceNotFound(resp);
            }

            Collection.removeOwnedById(
                Collections.Following,
                localUser,
                remoteActorId,
                err => {
                    if (err) {
                        this.log.error(
                            { remoteActorId, localActorId },
                            'Failed removing "following" record'
                        );
                    }
                    return this.webServer.accepted(resp);
                }
            );
        });
    }

    _inboxDeleteActivity(inboxType, signature, resp, activity) {
        const objectId = _.get(activity, 'object.id', activity.object);

        this.log.info({ inboxType, objectId }, 'Incoming Delete request');

        //  :TODO: we need to DELETE the existing stored Message object if this is a Note, or associated if this is an Actor
        //  :TODO: delete / invalidate any actor cache if actor
        Collection.objectsById(objectId, (err, objectsInfo) => {
            if (err) {
                this.log.warn({ objectId });
                // We'll respond accepted so they don't keep trying
                return this.webServer.accepted(resp);
            }

            if (objectsInfo.length === 0) {
                return this.webServer.resourceNotFound(resp);
            }

            //  Generally we'd have a 1:1 objectId -> object here, but it's
            //  possible for example, that we're being asked to delete an Actor;
            //  If this is the case, they may be following multiple local Actor/users
            //  and we have multiple entries.
            const stats = {
                deleted: [],
                failed: [],
            };
            async.forEachSeries(
                objectsInfo,
                (objInfo, nextObjInfo) => {
                    const collectionName = objInfo.info.name;

                    if (objInfo.object) {
                        //  Based on the collection we find this entry in,
                        //  we may have additional validation or actions
                        switch (collectionName) {
                            case Collections.Inbox:
                            case Collections.SharedInbox:
                                // Validate the inbox this was sent to
                                if (inboxType !== collectionName) {
                                    this.log.warn(
                                        { inboxType, collectionName, objectId },
                                        'Will not Delete object(s) from mismatched collection!'
                                    );
                                    return nextObjInfo(null);
                                }

                                // Validate signature

                                break;

                            case Collections.Actors:
                                // Validate signature; Delete Actor and Following entries if any
                                break;

                            case Collection.Following:
                                break;

                            default:
                                break;
                        }

                        return nextObjInfo(null);
                    } else {
                        // it's unparsable, so we'll delete it
                        Collection.removeById(collectionName, objectId, err => {
                            if (err) {
                                this.log.warn(
                                    { objectId, collectionName },
                                    'Failed to remove object'
                                );
                                stats.failed.push({ collectionName, objectId });
                            } else {
                                stats.deleted.push({ collectionName, objectId });
                            }
                            return nextObjInfo(null);
                        });
                    }
                },
                err => {
                    if (err) {
                        //  :TODO: log me
                    }

                    this.log.info({ stats, inboxType }, 'Inbox Delete request complete');
                    return this.webServer.accepted(resp);
                }
            );
        });

        return this.webServer.accepted(resp);
    }

    _inboxFollowActivity(resp, remoteActor, activity) {
        this.log.info(
            { remoteActorId: remoteActor.id, localActorId: activity.object },
            'Incoming Follow Activity'
        );

        userFromActorId(activity.object, (err, localUser) => {
            if (err) {
                return this.webServer.resourceNotFound(resp);
            }

            //  User accepts any followers automatically
            const activityPubSettings = ActivityPubSettings.fromUser(localUser);
            if (!activityPubSettings.manuallyApproveFollowers) {
                this._recordAcceptedFollowRequest(localUser, remoteActor, activity);
                return this.webServer.accepted(resp);
            }

            //  User manually approves requests; add them to their requests collection
            Collection.addFollowRequest(
                localUser,
                remoteActor,
                this.webServer,
                true, // ignore dupes
                err => {
                    if (err) {
                        return this.internalServerError(resp, err);
                    }

                    return this.webServer.accepted(resp);
                }
            );
        });
    }

    _inboxRejectActivity(resp, activity) {
        const rejectWhat = _.get(activity, 'object.type');
        switch (rejectWhat) {
            case WellKnownActivity.Follow:
                return this._inboxRejectFollowActivity(resp, activity);

            default:
                this.log.warn(
                    { type: rejectWhat },
                    'Invalid or unsupported "Reject" type'
                );
                return this.webServer.notImplemented(resp);
        }
    }

    _inboxUndoActivity(resp, remoteActor, activity) {
        const localActorId = _.get(activity, 'object.object');

        this.log.info(
            { remoteActorId: remoteActor.id, localActorId },
            'Incoming Undo Activity'
        );

        userFromActorId(localActorId, (err, localUser) => {
            if (err) {
                return this.webServer.resourceNotFound(resp);
            }

            Collection.removeOwnedById(
                Collections.Followers,
                localUser,
                remoteActor.id,
                err => {
                    if (err) {
                        return this.webServer.internalServerError(resp, err);
                    }

                    this.log.info(
                        {
                            username: localUser.username,
                            userId: localUser.userId,
                            remoteActorId: remoteActor.id,
                        },
                        'Undo "Follow" (un-follow) success'
                    );

                    return this.webServer.accepted(resp);
                }
            );
        });
    }

    _localUserFromCollectionEndpoint(req, collectionName, cb) {
        //  turn a collection URL to a Actor ID
        let actorId = this.webServer.fullUrl(req).toString();
        const suffix = `/${collectionName}`;
        if (actorId.endsWith(suffix)) {
            actorId = actorId.slice(0, -suffix.length);
        }

        userFromActorId(actorId, (err, localUser) => {
            return cb(err, localUser);
        });
    }

    _validateActorSignature(actor, signature) {
        const pubKey = actor.publicKey;
        if (!_.isObject(pubKey)) {
            this.log.debug('Expected object of "pubKey"');
            return false;
        }

        if (signature.keyId !== pubKey.id) {
            this.log.warn(
                {
                    actorId: actor.id,
                    signatureKeyId: signature.keyId,
                    actorPubKeyId: pubKey.id,
                },
                'Key ID mismatch'
            );
            return false;
        }

        if (!httpSignature.verifySignature(signature, pubKey.publicKeyPem)) {
            this.log.warn(
                {
                    actorId: actor.id,
                    keyId: signature.keyId,
                },
                'Actor signature verification failed'
            );
            return false;
        }

        return true;
    }

    _inboxMutateExistingObject(inboxType, signature, resp, activity, mutator) {
        const targetObjectId = _.get(activity, 'object.id');
        const objectType = _.get(activity, 'object.type');

        Collection.objectByEmbeddedId(targetObjectId, (err, obj) => {
            if (err) {
                return this.webServer.internalServerError(resp, err);
            }

            if (!obj) {
                this.log.warn(
                    { targetObjectId, type: objectType, activityType: activity.type },
                    `Could not ${activity.type} Object; Not found`
                );
                return this.webServer.resourceNotFound(resp);
            }

            //
            //  Object exists; Validate we allow the action by origin
            //  comparing the request's keyId origin to the object's
            //
            try {
                const updateTargetHost = new URL(obj.object.id).host;
                const keyIdHost = new URL(signature.keyId).host;

                if (updateTargetHost !== keyIdHost) {
                    this.log.warn(
                        {
                            targetObjectId,
                            type: objectType,
                            updateTargetHost,
                            keyIdHost,
                            activityType: activity.type,
                        },
                        `Attempt to ${activity.type} Object of non-matching origin`
                    );
                    return this.webServer.accessDenied(resp);
                }

                return mutator(inboxType, resp, objectType, targetObjectId, activity);
            } catch (e) {
                return this.webServer.internalServerError(resp, e);
            }
        });
    }

    // _inboxDeleteActivityMutator(inboxType, resp, objectType, targetObjectId) {
    //     Collection.removeById(inboxType, targetObjectId, err => {
    //         if (err) {
    //             return this.webServer.internalServerError(resp, err);
    //         }

    //         this.log.info(
    //             {
    //                 inboxType,
    //                 objectId: targetObjectId,
    //                 objectType,
    //             },
    //             `${objectType} Deleted`
    //         );

    //         //  :TODO: we need to DELETE the existing stored Message object if this is a Note

    //         return this.webServer.accepted(resp);
    //     });
    // }

    _inboxUpdateObjectMutator(inboxType, resp, objectType, targetObjectId, activity) {
        Collection.updateCollectionEntry(inboxType, targetObjectId, activity, err => {
            if (err) {
                return this.webServer.internalServerError(resp, err);
            }

            this.log.info(
                {
                    inboxType,
                    objectId: targetObjectId,
                    objectType,
                },
                `${objectType} Updated`
            );

            //  :TODO: we need to UPDATE the existing stored Message object if this is a Note

            return this.webServer.accepted(resp);
        });
    }

    _deliverNoteToSharedInbox(activity, note, cb) {
        this.log.info({ noteId: note.id }, 'Delivering Note to Public inbox');

        Collection.addSharedInboxItem(activity, true, err => {
            if (err) {
                return cb(err);
            }

            return this._storeNoteAsMessage(
                activity.id,
                'All',
                Message.WellKnownAreaTags.ActivityPubShared,
                note,
                cb
            );
        });
    }

    _deliverNoteToLocalActor(actorId, activity, note, cb) {
        this.log.info(
            { noteId: note.id, actorId },
            'Delivering Note to local Actor Private inbox'
        );

        userFromActorId(actorId, (err, localUser) => {
            if (err) {
                return cb(null); //  not found/etc., just bail
            }

            Collection.addInboxItem(activity, localUser, this.webServer, false, err => {
                if (err) {
                    return cb(err);
                }

                return this._storeNoteAsMessage(
                    activity.id,
                    localUser,
                    Message.WellKnownAreaTags.Private,
                    note,
                    cb
                );
            });
        });
    }

    _storeNoteAsMessage(activityId, localAddressedTo, areaTag, note, cb) {
        //
        // Import the item to the user's private mailbox
        //
        const messageOpts = {
            //  Notes can have 1:N 'to' relationships while a Message is 1:1;
            activityId,
            toUser: localAddressedTo,
            areaTag: areaTag,
        };

        note.toMessage(messageOpts, (err, message) => {
            if (err) {
                return cb(err);
            }

            message.persist(err => {
                if (!err) {
                    if (_.isObject(localAddressedTo)) {
                        localAddressedTo = localAddressedTo.username;
                    }
                    this.log.info(
                        {
                            localAddressedTo,
                            activityId,
                            noteId: note.id,
                        },
                        'Note delivered as message to private mailbox'
                    );
                } else if (err.code === 'SQLITE_CONSTRAINT') {
                    return cb(null);
                }
                return cb(err);
            });
        });
    }

    _actorCollectionRequest(collectionName, req, resp) {
        this.log.debug({ url: req.url }, `Request for "${collectionName}"`);

        const getCollection = Collection[collectionName];
        if (!getCollection) {
            return this.webServer.resourceNotFound(resp);
        }

        const url = this.webServer.fullUrl(req);
        const page = url.searchParams.get('page');
        const collectionId = url.toString();

        this._localUserFromCollectionEndpoint(req, collectionName, (err, localUser) => {
            if (err) {
                return this.webServer.resourceNotFound(resp);
            }

            const apSettings = ActivityPubSettings.fromUser(localUser);
            if (apSettings.hideSocialGraph) {
                this.log.info(
                    { user: localUser.username },
                    `User has ${collectionName} hidden`
                );
                return this.webServer.accessDenied(resp);
            }

            //  :TODO: these getters should take a owningUser; they are not strictly public
            getCollection(collectionId, page, (err, collection) => {
                if (err) {
                    return this.webServer.internalServerError(resp, err);
                }

                const body = JSON.stringify(collection);
                return this.webServer.ok(resp, body, {
                    'Content-Type': ActivityStreamMediaType,
                });
            });
        });

        //  :TODO: we need to validate the local user allows access to the particular collection
    }

    _followingGetHandler(req, resp) {
        return this._actorCollectionRequest(Collections.Following, req, resp);
    }

    _followersGetHandler(req, resp) {
        return this._actorCollectionRequest(Collections.Followers, req, resp);
    }

    // https://docs.gotosocial.org/en/latest/federation/behaviors/outbox/
    _outboxGetHandler(req, resp) {
        this.log.debug({ url: req.url }, 'Request for "outbox"');
        return this._actorCollectionRequest(Collections.Outbox, req, resp);
    }

    _singlePublicNoteGetHandler(req, resp) {
        this.log.debug({ url: req.url }, 'Request for "Note"');

        const noteId = this.webServer.fullUrl(req).toString();
        Note.fromPublicNoteId(noteId, (err, note) => {
            if (err) {
                return this.webServer.internalServerError(resp, err);
            }

            if (!note) {
                return this.webServer.resourceNotFound(resp);
            }

            //  :TODO: support a template here

            return this.webServer.ok(resp, note.content);
        });
    }

    _recordAcceptedFollowRequest(localUser, remoteActor, requestActivity) {
        async.series(
            [
                callback => {
                    return Collection.addFollower(
                        localUser,
                        remoteActor,
                        this.webServer,
                        true, // ignore dupes
                        callback
                    );
                },
                callback => {
                    Actor.fromLocalUser(localUser, this.webServer, (err, localActor) => {
                        if (err) {
                            this.log.warn(
                                { inbox: remoteActor.inbox, error: err.message },
                                'Failed to load local Actor for "Accept"'
                            );
                            return callback(err);
                        }

                        const accept = Activity.makeAccept(
                            this.webServer,
                            localActor.id,
                            requestActivity
                        );

                        accept.sendTo(
                            remoteActor.inbox,
                            localUser,
                            this.webServer,
                            (err, respBody, res) => {
                                if (err) {
                                    this.log.warn(
                                        {
                                            inbox: remoteActor.inbox,
                                            error: err.message,
                                        },
                                        'Failed POSTing "Accept" to inbox'
                                    );
                                    return callback(null); // just a warning
                                }

                                if (res.statusCode !== 202 && res.statusCode !== 200) {
                                    this.log.warn(
                                        {
                                            inbox: remoteActor.inbox,
                                            statusCode: res.statusCode,
                                        },
                                        'Unexpected status code'
                                    );
                                    return callback(null); // just a warning
                                }

                                this.log.info(
                                    { inbox: remoteActor.inbox },
                                    'Remote server received our "Accept" successfully'
                                );

                                return callback(null);
                            }
                        );
                    });
                },
            ],
            err => {
                if (err) {
                    //  :TODO: move this request to the "Request queue" for the user to try later
                    this.log.error(
                        { error: err.message },
                        'Failed processing Follow request'
                    );
                }
            }
        );
    }

    _selfAsActorHandler(localUser, localActor, req, resp) {
        this.log.info(
            { username: localUser.username },
            `Serving ActivityPub Actor for "${localUser.username}"`
        );

        const body = JSON.stringify(localActor);

        return this.webServer.ok(resp, body, { 'Content-Type': ActivityStreamMediaType });
    }

    _selfAsProfileHandler(localUser, localActor, req, resp) {
        let templateFile = _.get(
            Config(),
            'contentServers.web.handlers.activityPub.selfTemplate'
        );
        if (templateFile) {
            templateFile = this.webServer.resolveTemplatePath(templateFile);
        }

        // we'll fall back to the same default profile info as the WebFinger profile
        getUserProfileTemplatedBody(
            this.webServer,
            templateFile,
            localUser,
            localActor,
            DefaultProfileTemplate,
            'text/plain',
            (err, body, contentType) => {
                if (err) {
                    return this.webServer.resourceNotFound(resp);
                }

                this.log.info(
                    { username: localUser.username },
                    `Serving ActivityPub Profile for "${localUser.username}"`
                );

                return this.webServer.ok(resp, body, { 'Content-Type': contentType });
            }
        );
    }

    _prepareNewUserAsActor(user, cb) {
        this.log.info(
            { username: user.username, userId: user.userId },
            `Preparing ActivityPub settings for "${user.username}"`
        );

        const actorId = Endpoints.actorId(this.webServer, user);
        user.setProperty(UserProps.ActivityPubActorId, actorId);

        user.updateActivityPubKeyPairProperties(err => {
            if (err) {
                return cb(err);
            }

            user.generateNewRandomAvatar((err, outPath) => {
                if (err) {
                    this.log.warn(
                        {
                            username: user.username,
                            userId: user.userId,
                            error: err.message,
                        },
                        `Failed to generate random avatar for "${user.username}"`
                    );
                }

                //  :TODO: fetch over +op default overrides here, e.g. 'enabled'
                const apSettings = ActivityPubSettings.fromUser(user);

                const filename = paths.basename(outPath);
                const avatarUrl = Endpoints.avatar(this.webServer, user, filename);

                apSettings.image = avatarUrl;
                apSettings.icon = avatarUrl;

                user.setProperty(
                    UserProps.ActivityPubSettings,
                    JSON.stringify(apSettings)
                );

                return cb(null);
            });
        });
    }
};
