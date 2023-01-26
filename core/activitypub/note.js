const Message = require('../message');
const ActivityPubObject = require('./object');
const { Errors } = require('../enig_error');
const { getISOTimestampString } = require('../database');
const User = require('../user');
const { messageBodyToHtml, htmlToMessageBody } = require('./util');
const { isAnsi } = require('../string_util');

// deps
const { v5: UUIDv5 } = require('uuid');
const Actor = require('./actor');
const moment = require('moment');
const Collection = require('./collection');
const async = require('async');
const { isString, isObject, truncate } = require('lodash');

const APMessageIdNamespace = '307bc7b3-3735-4573-9a20-e3f9eaac29c5';
const APDefaultSummary = '[ActivityPub]';

module.exports = class Note extends ActivityPubObject {
    constructor(obj) {
        super(obj);
    }

    isValid() {
        if (!super.isValid()) {
            return false;
        }

        //  :TODO: validate required properties

        return true;
    }

    static fromPublicNoteId(noteId, cb) {
        Collection.embeddedObjById('outbox', false, noteId, (err, obj) => {
            if (err) {
                return cb(err);
            }

            return cb(null, new Note(obj.object));
        });
    }

    // A local Message bound for ActivityPub
    static fromLocalOutgoingMessage(message, webServer, cb) {
        const localUserId = message.getLocalFromUserId();
        if (!localUserId) {
            return cb(Errors.UnexpectedState('Invalid user ID for local user!'));
        }

        if (Message.AddressFlavor.ActivityPub !== message.getAddressFlavor()) {
            return cb(
                Errors.Invalid('Cannot build note for non-ActivityPub addressed message')
            );
        }

        const remoteActorAccount = message.getRemoteToUser();
        if (!remoteActorAccount) {
            return cb(
                Errors.UnexpectedState('Message does not contain a remote address')
            );
        }

        async.waterfall(
            [
                callback => {
                    return User.getUser(localUserId, callback);
                },
                (fromUser, callback) => {
                    Actor.fromLocalUser(fromUser, webServer, (err, fromActor) => {
                        return callback(err, fromUser, fromActor);
                    });
                },
                (fromUser, fromActor, callback) => {
                    Actor.fromId(remoteActorAccount, (err, remoteActor) => {
                        return callback(err, fromUser, fromActor, remoteActor);
                    });
                },
                (fromUser, fromActor, remoteActor, callback) => {
                    if (!message.replyToMsgId) {
                        return callback(null, null, fromUser, fromActor, remoteActor);
                    }

                    Message.getMetaValuesByMessageId(
                        message.replyToMsgId,
                        Message.WellKnownMetaCategories.ActivityPub,
                        Message.ActivityPubPropertyNames.NoteId,
                        (err, replyToNoteId) => {
                            // (ignore error)
                            return callback(
                                null,
                                replyToNoteId,
                                fromUser,
                                fromActor,
                                remoteActor
                            );
                        }
                    );
                },
                (replyToNoteId, fromUser, fromActor, remoteActor, callback) => {
                    const to = [
                        message.isPrivate()
                            ? remoteActor.id
                            : Collection.PublicCollectionId,
                    ];

                    const sourceMediaType = isAnsi(message.message)
                        ? 'text/x-ansi' // ye ol' https://lists.freedesktop.org/archives/xdg/2006-March/006214.html
                        : 'text/plain';

                    // https://docs.joinmastodon.org/spec/activitypub/#properties-used
                    const obj = {
                        id: ActivityPubObject.makeObjectId(webServer, 'note'),
                        type: 'Note',
                        published: getISOTimestampString(message.modTimestamp),
                        to,
                        attributedTo: fromActor.id,
                        content: messageBodyToHtml(message.message.trim()),
                        source: {
                            content: message.message,
                            mediaType: sourceMediaType,
                        },
                    };

                    if (replyToNoteId) {
                        obj.inReplyTo = replyToNoteId;
                    }

                    //  ignore the subject if it's our default summary value for replies
                    if (message.subject !== `RE: ${APDefaultSummary}`) {
                        obj.summary = message.subject;
                    }

                    const note = new Note(obj);
                    return callback(null, { note, fromUser, remoteActor });
                },
            ],
            (err, noteInfo) => {
                return cb(err, noteInfo);
            }
        );
    }

    toMessage(options, cb) {
        if (!isObject(options.toUser) || !isString(options.areaTag)) {
            return cb(Errors.MissingParam('Missing one or more required options!'));
        }

        // stable ID based on Note ID
        const message = new Message({
            uuid: UUIDv5(this.id, APMessageIdNamespace),
        });

        // Fetch the remote actor info to get their user info
        Actor.fromId(this.attributedTo, (err, attributedToActor, fromActorSubject) => {
            if (err) {
                return cb(err);
            }

            message.fromUserName = fromActorSubject || this.attributedTo;

            //
            //  Note's can be addressed to 1:N users, but a Message is a 1:1
            //  relationship. This method requires the mapping up front via options
            //
            message.toUserName = options.toUser.username;
            message.meta.System[Message.SystemMetaNames.LocalToUserID] =
                options.toUser.userId;
            message.areaTag = options.areaTag || Message.WellKnownAreaTags.Private;

            //  :TODO: it would be better to do some basic HTML to ANSI or pipe codes perhaps
            message.message = htmlToMessageBody(this.content);
            message.subject =
                this.summary ||
                truncate(message.message, { length: 32, omission: '...' }) ||
                APDefaultSummary;

            try {
                message.modTimestamp = moment(this.published);
            } catch (e) {
                //  :TODO: Log warning
                message.modTimestamp = moment();
            }

            //  :TODO: replyToMsgId from 'inReplyTo'
            message.setRemoteFromUser(this.attributedTo);
            message.setExternalFlavor(Message.AddressFlavor.ActivityPub);

            message.meta.ActivityPub = message.meta.ActivityPub || {};
            message.meta.ActivityPub[Message.ActivityPubPropertyNames.ActivityId] =
                options.activityId || 0;
            message.meta.ActivityPub[Message.ActivityPubPropertyNames.NoteId] = this.id;

            if (this.inReplyTo) {
                message.meta.ActivityPub[Message.ActivityPubPropertyNames.InReplyTo] =
                    this.inReplyTo;
            }

            return cb(null, message);
        });
    }
};
