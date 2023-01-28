const { WellKnownLocations } = require('../servers/content/web');
const User = require('../user');
const { Errors, ErrorReasons } = require('../enig_error');
const UserProps = require('../user_property');
const ActivityPubSettings = require('./settings');
const { stripAnsiControlCodes } = require('../string_util');

// deps
const _ = require('lodash');
const mimeTypes = require('mime-types');
const waterfall = require('async/waterfall');
const fs = require('graceful-fs');
const paths = require('path');
const moment = require('moment');
const { striptags } = require('striptags');
const { encode, decode } = require('html-entities');

exports.ActivityStreamsContext = 'https://www.w3.org/ns/activitystreams';
exports.isValidLink = isValidLink;
exports.makeSharedInboxUrl = makeSharedInboxUrl;
exports.makeUserUrl = makeUserUrl;
exports.webFingerProfileUrl = webFingerProfileUrl;
exports.localActorId = localActorId;
exports.userFromActorId = userFromActorId;
exports.getUserProfileTemplatedBody = getUserProfileTemplatedBody;
exports.messageBodyToHtml = messageBodyToHtml;
exports.htmlToMessageBody = htmlToMessageBody;
exports.userNameFromSubject = userNameFromSubject;

//  :TODO: more info in default
// this profile template is the *default* for both WebFinger
// profiles and 'self' requests without the
// Accept: application/activity+json headers present
exports.DefaultProfileTemplate = `
User information for: %USERNAME%

Real Name: %REAL_NAME%
Login Count: %LOGIN_COUNT%
Affiliations: %AFFILIATIONS%
Achievement Points: %ACHIEVEMENT_POINTS%
`;

function isValidLink(l) {
    return /^https?:\/\/.+$/.test(l);
}

function makeSharedInboxUrl(webServer) {
    return webServer.buildUrl(WellKnownLocations.Internal + '/ap/shared-inbox');
}

function makeUserUrl(webServer, user, relPrefix) {
    return webServer.buildUrl(
        WellKnownLocations.Internal + `${relPrefix}${user.username}`
    );
}

function webFingerProfileUrl(webServer, user) {
    return webServer.buildUrl(WellKnownLocations.Internal + `/wf/@${user.username}`);
}

function localActorId(webServer, user) {
    return makeUserUrl(webServer, user, '/ap/users/');
}

function userFromActorId(actorId, cb) {
    User.getUserIdsWithProperty(UserProps.ActivityPubActorId, actorId, (err, userId) => {
        if (err) {
            return cb(err);
        }

        // must only be 0 or 1
        if (!Array.isArray(userId) || userId.length !== 1) {
            return cb(
                Errors.DoesNotExist(
                    `No user with property '${UserProps.ActivityPubActorId}' of ${actorId}`
                )
            );
        }

        userId = userId[0];
        User.getUser(userId, (err, user) => {
            if (err) {
                return cb(err);
            }

            const accountStatus = user.getPropertyAsNumber(UserProps.AccountStatus);
            if (
                User.AccountStatus.disabled == accountStatus ||
                User.AccountStatus.inactive == accountStatus
            ) {
                return cb(Errors.AccessDenied('Account disabled', ErrorReasons.Disabled));
            }

            const activityPubSettings = ActivityPubSettings.fromUser(user);
            if (!activityPubSettings.enabled) {
                return cb(Errors.AccessDenied('ActivityPub is not enabled for user'));
            }

            return cb(null, user);
        });
    });
}

function getUserProfileTemplatedBody(
    templateFile,
    user,
    defaultTemplate,
    defaultContentType,
    cb
) {
    const Log = require('../logger').log;
    const Config = require('../config').get;

    waterfall(
        [
            callback => {
                return fs.readFile(templateFile || '', 'utf8', (err, template) => {
                    return callback(null, template);
                });
            },
            (template, callback) => {
                if (!template) {
                    if (templateFile) {
                        Log.warn(`Failed to load profile template "${templateFile}"`);
                    }
                    return callback(null, defaultTemplate, defaultContentType);
                }

                const contentType = mimeTypes.contentType(paths.basename(templateFile));
                return callback(null, template, contentType);
            },
            (template, contentType, callback) => {
                const up = (p, na = 'N/A') => {
                    return user.getProperty(p) || na;
                };

                let birthDate = up(UserProps.Birthdate);
                if (moment.isDate(birthDate)) {
                    birthDate = moment(birthDate);
                }

                const varMap = {
                    USERNAME: user.username,
                    REAL_NAME: user.getSanitizedName('real'),
                    SEX: up(UserProps.Sex),
                    BIRTHDATE: birthDate,
                    AGE: user.getAge(),
                    LOCATION: up(UserProps.Location),
                    AFFILIATIONS: up(UserProps.Affiliations),
                    EMAIL: up(UserProps.EmailAddress),
                    WEB_ADDRESS: up(UserProps.WebAddress),
                    ACCOUNT_CREATED: moment(user.getProperty(UserProps.AccountCreated)),
                    LAST_LOGIN: moment(user.getProperty(UserProps.LastLoginTs)),
                    LOGIN_COUNT: up(UserProps.LoginCount),
                    ACHIEVEMENT_COUNT: up(UserProps.AchievementTotalCount, '0'),
                    ACHIEVEMENT_POINTS: up(UserProps.AchievementTotalPoints, '0'),
                    BOARDNAME: Config().general.boardName,
                };

                let body = template;
                _.each(varMap, (val, varName) => {
                    body = body.replace(new RegExp(`%${varName}%`, 'g'), val);
                });

                return callback(null, body, contentType);
            },
        ],
        (err, data, contentType) => {
            return cb(err, data, contentType);
        }
    );
}

//
//  Apply very basic HTML to a message following
//  Mastodon's supported tags of 'p', 'br', 'a', and 'span':
//  - https://docs.joinmastodon.org/spec/activitypub/#sanitization
//  - https://blog.joinmastodon.org/2018/06/how-to-implement-a-basic-activitypub-server/
//
//  :TODO: https://docs.joinmastodon.org/spec/microformats/
function messageBodyToHtml(body) {
    body = encode(stripAnsiControlCodes(body), { mode: 'nonAsciiPrintable' }).replace(
        /\r?\n/g,
        '<br>'
    );

    return `<p>${body}</p>`;
}

function htmlToMessageBody(html) {
    // <br>, </br>, and <br/> -> \r\n
    html = html.replace(/<\/?br?\/?>/g, '\r\n');
    return striptags(decode(html));
}

function userNameFromSubject(subject) {
    return subject.replace(/^acct:(.+)$/, '$1');
}
