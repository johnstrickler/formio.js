var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
/* globals OktaAuth */
// Intentionally use native-promise-only here... Other promise libraries (es6-promise)
// duck-punch the global Promise definition which messes up Angular 2 since it
// also duck-punches the global Promise definition. For now, keep native-promise-only.
import NativePromise from 'native-promise-only';
import fetchPonyfill from 'fetch-ponyfill';
import { EventEmitter2 as EventEmitter } from 'eventemitter2';
import cookies from 'browser-cookies';
import { Providers } from './providers';
import _intersection from 'lodash/intersection';
import _get from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import _defaults from 'lodash/defaults';
import { eachComponent } from './utils/utils';
import jwtDecode from 'jwt-decode';
var _a = fetchPonyfill({
    Promise: NativePromise
}), fetch = _a.fetch, Headers = _a.Headers;
var isBoolean = function (val) { return typeof val === typeof true; };
var isNil = function (val) { return val === null || val === undefined; };
var isObject = function (val) { return val && typeof val === 'object'; };
function cloneResponse(response) {
    var copy = _cloneDeep(response);
    if (Array.isArray(response)) {
        copy.skip = response.skip;
        copy.limit = response.limit;
        copy.serverCount = response.serverCount;
    }
    return copy;
}
/**
 * The Formio interface class.
 *
 *   let formio = new Formio('https://examples.form.io/example');
 */
var Formio = /** @class */ (function () {
    /* eslint-disable max-statements */
    function Formio(path, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        // Ensure we have an instance of Formio.
        if (!(this instanceof Formio)) {
            return new Formio(path);
        }
        // Initialize our variables.
        this.base = '';
        this.projectsUrl = '';
        this.projectUrl = '';
        this.projectId = '';
        this.roleUrl = '';
        this.rolesUrl = '';
        this.roleId = '';
        this.formUrl = '';
        this.formsUrl = '';
        this.formId = '';
        this.submissionsUrl = '';
        this.submissionUrl = '';
        this.submissionId = '';
        this.actionsUrl = '';
        this.actionId = '';
        this.actionUrl = '';
        this.vsUrl = '';
        this.vId = '';
        this.vUrl = '';
        this.query = '';
        // Store the original path and options.
        this.path = path;
        this.options = options;
        if (options.hasOwnProperty('base')) {
            this.base = options.base;
        }
        else if (Formio.baseUrl) {
            this.base = Formio.baseUrl;
        }
        else {
            this.base = window.location.href.match(/http[s]?:\/\/api./)[0];
        }
        if (!path) {
            // Allow user to create new projects if this was instantiated without
            // a url
            this.projectUrl = Formio.projectUrl || this.base + "/project";
            this.projectsUrl = this.base + "/project";
            this.projectId = false;
            this.query = '';
            return;
        }
        if (options.hasOwnProperty('project')) {
            this.projectUrl = options.project;
        }
        var project = this.projectUrl || Formio.projectUrl;
        var projectRegEx = /(^|\/)(project)($|\/[^/]+)/;
        var isProjectUrl = (path.search(projectRegEx) !== -1);
        // The baseURL is the same as the projectUrl, and does not contain "/project/MONGO_ID" in
        // its domain. This is almost certainly against the Open Source server.
        if (project && this.base === project && !isProjectUrl) {
            this.noProject = true;
            this.projectUrl = this.base;
        }
        // Normalize to an absolute path.
        if ((path.indexOf('http') !== 0) && (path.indexOf('//') !== 0)) {
            path = this.base + path;
        }
        var hostparts = this.getUrlParts(path);
        var parts = [];
        var hostName = hostparts[1] + hostparts[2];
        path = hostparts.length > 3 ? hostparts[3] : '';
        var queryparts = path.split('?');
        if (queryparts.length > 1) {
            path = queryparts[0];
            this.query = "?" + queryparts[1];
        }
        // Register a specific path.
        var registerPath = function (name, base) {
            _this[name + "sUrl"] = base + "/" + name;
            var regex = new RegExp("/" + name + "/([^/]+)");
            if (path.search(regex) !== -1) {
                parts = path.match(regex);
                _this[name + "Url"] = parts ? (base + parts[0]) : '';
                _this[name + "Id"] = (parts.length > 1) ? parts[1] : '';
                base += parts[0];
            }
            return base;
        };
        // Register an array of items.
        var registerItems = function (items, base, staticBase) {
            for (var i in items) {
                if (items.hasOwnProperty(i)) {
                    var item = items[i];
                    if (Array.isArray(item)) {
                        registerItems(item, base, true);
                    }
                    else {
                        var newBase = registerPath(item, base);
                        base = staticBase ? base : newBase;
                    }
                }
            }
        };
        if (!this.projectUrl || (this.projectUrl === this.base)) {
            this.projectUrl = hostName;
        }
        if (!this.noProject) {
            // Determine the projectUrl and projectId
            if (isProjectUrl) {
                // Get project id as project/:projectId.
                registerItems(['project'], hostName);
                path = path.replace(projectRegEx, '');
            }
            else if (hostName === this.base) {
                // Get project id as first part of path (subdirectory).
                if (hostparts.length > 3 && path.split('/').length > 1) {
                    var pathParts = path.split('/');
                    pathParts.shift(); // Throw away the first /.
                    this.projectId = pathParts.shift();
                    path = "/" + pathParts.join('/');
                    this.projectUrl = hostName + "/" + this.projectId;
                }
            }
            else {
                // Get project id from subdomain.
                if (hostparts.length > 2 && (hostparts[2].split('.').length > 2 || hostName.includes('localhost'))) {
                    this.projectUrl = hostName;
                    this.projectId = hostparts[2].split('.')[0];
                }
            }
            this.projectsUrl = this.projectsUrl || this.base + "/project";
        }
        // Configure Role urls and role ids.
        registerItems(['role'], this.projectUrl);
        // Configure Form urls and form ids.
        if (/(^|\/)(form)($|\/)/.test(path)) {
            registerItems(['form', ['submission', 'action', 'v']], this.projectUrl);
        }
        else {
            var subRegEx = new RegExp('/(submission|action|v)($|/.*)');
            var subs = path.match(subRegEx);
            this.pathType = (subs && (subs.length > 1)) ? subs[1] : '';
            path = path.replace(subRegEx, '');
            path = path.replace(/\/$/, '');
            this.formsUrl = this.projectUrl + "/form";
            this.formUrl = path ? this.projectUrl + path : '';
            this.formId = path.replace(/^\/+|\/+$/g, '');
            var items = ['submission', 'action', 'v'];
            for (var i in items) {
                if (items.hasOwnProperty(i)) {
                    var item = items[i];
                    this[item + "sUrl"] = this.projectUrl + path + "/" + item;
                    if ((this.pathType === item) && (subs.length > 2) && subs[2]) {
                        this[item + "Id"] = subs[2].replace(/^\/+|\/+$/g, '');
                        this[item + "Url"] = this.projectUrl + path + subs[0];
                    }
                }
            }
        }
        // Set the app url if it is not set.
        if (!Formio.projectUrlSet) {
            Formio.projectUrl = this.projectUrl;
        }
    }
    /* eslint-enable max-statements */
    Formio.prototype.delete = function (type, opts) {
        var _id = type + "Id";
        var _url = type + "Url";
        if (!this[_id]) {
            NativePromise.reject('Nothing to delete');
        }
        Formio.cache = {};
        return this.makeRequest(type, this[_url], 'delete', null, opts);
    };
    Formio.prototype.index = function (type, query, opts) {
        var _url = type + "Url";
        query = query || '';
        if (query && isObject(query)) {
            query = "?" + Formio.serialize(query.params);
        }
        return this.makeRequest(type, this[_url] + query, 'get', null, opts);
    };
    Formio.prototype.save = function (type, data, opts) {
        var _id = type + "Id";
        var _url = type + "Url";
        var method = (this[_id] || data._id) ? 'put' : 'post';
        var reqUrl = this[_id] ? this[_url] : this[type + "sUrl"];
        if (!this[_id] && data._id && (method === 'put') && !reqUrl.includes(data._id)) {
            reqUrl += "/" + data._id;
        }
        Formio.cache = {};
        return this.makeRequest(type, reqUrl + this.query, method, data, opts);
    };
    Formio.prototype.load = function (type, query, opts) {
        var _id = type + "Id";
        var _url = type + "Url";
        if (query && isObject(query)) {
            query = Formio.serialize(query.params);
        }
        if (query) {
            query = this.query ? (this.query + "&" + query) : ("?" + query);
        }
        else {
            query = this.query;
        }
        if (!this[_id]) {
            return NativePromise.reject("Missing " + _id);
        }
        return this.makeRequest(type, this[_url] + query, 'get', null, opts);
    };
    Formio.prototype.makeRequest = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return Formio.makeRequest.apply(Formio, __spreadArrays([this], args));
    };
    Formio.prototype.loadProject = function (query, opts) {
        return this.load('project', query, opts);
    };
    Formio.prototype.saveProject = function (data, opts) {
        return this.save('project', data, opts);
    };
    Formio.prototype.deleteProject = function (opts) {
        return this.delete('project', opts);
    };
    Formio.loadProjects = function (query, opts) {
        query = query || '';
        if (isObject(query)) {
            query = "?" + Formio.serialize(query.params);
        }
        return Formio.makeStaticRequest(Formio.baseUrl + "/project" + query, 'GET', null, opts);
    };
    Formio.prototype.loadRole = function (opts) {
        return this.load('role', null, opts);
    };
    Formio.prototype.saveRole = function (data, opts) {
        return this.save('role', data, opts);
    };
    Formio.prototype.deleteRole = function (opts) {
        return this.delete('role', opts);
    };
    Formio.prototype.loadRoles = function (opts) {
        return this.index('roles', null, opts);
    };
    Formio.prototype.loadForm = function (query, opts) {
        var _this = this;
        return this.load('form', query, opts)
            .then(function (currentForm) {
            // Check to see if there isn't a number in vId.
            if (!currentForm.revisions || isNaN(parseInt(_this.vId))) {
                return currentForm;
            }
            // If a submission already exists but form is marked to load current version of form.
            if (currentForm.revisions === 'current' && _this.submissionId) {
                return currentForm;
            }
            // If they specified a revision form, load the revised form components.
            if (query && isObject(query)) {
                query = Formio.serialize(query.params);
            }
            if (query) {
                query = _this.query ? (_this.query + "&" + query) : ("?" + query);
            }
            else {
                query = _this.query;
            }
            return _this.makeRequest('form', _this.vUrl + query, 'get', null, opts)
                .then(function (revisionForm) {
                currentForm.components = revisionForm.components;
                currentForm.settings = revisionForm.settings;
                // Using object.assign so we don't cross polinate multiple form loads.
                return Object.assign({}, currentForm);
            })
                // If we couldn't load the revision, just return the original form.
                .catch(function () { return Object.assign({}, currentForm); });
        });
    };
    Formio.prototype.saveForm = function (data, opts) {
        return this.save('form', data, opts);
    };
    Formio.prototype.deleteForm = function (opts) {
        return this.delete('form', opts);
    };
    Formio.prototype.loadForms = function (query, opts) {
        return this.index('forms', query, opts);
    };
    Formio.prototype.loadSubmission = function (query, opts) {
        var _this = this;
        return this.load('submission', query, opts)
            .then(function (submission) {
            _this.vId = submission._fvid;
            _this.vUrl = _this.formUrl + "/v/" + _this.vId;
            return submission;
        });
    };
    Formio.prototype.saveSubmission = function (data, opts) {
        if (!isNaN(parseInt(this.vId))) {
            data._fvid = this.vId;
        }
        return this.save('submission', data, opts);
    };
    Formio.prototype.deleteSubmission = function (opts) {
        return this.delete('submission', opts);
    };
    Formio.prototype.loadSubmissions = function (query, opts) {
        return this.index('submissions', query, opts);
    };
    Formio.prototype.loadAction = function (query, opts) {
        return this.load('action', query, opts);
    };
    Formio.prototype.saveAction = function (data, opts) {
        return this.save('action', data, opts);
    };
    Formio.prototype.deleteAction = function (opts) {
        return this.delete('action', opts);
    };
    Formio.prototype.loadActions = function (query, opts) {
        return this.index('actions', query, opts);
    };
    Formio.prototype.availableActions = function () {
        return this.makeRequest('availableActions', this.formUrl + "/actions");
    };
    Formio.prototype.actionInfo = function (name) {
        return this.makeRequest('actionInfo', this.formUrl + "/actions/" + name);
    };
    Formio.prototype.isObjectId = function (id) {
        var checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');
        return checkForHexRegExp.test(id);
    };
    Formio.prototype.getProjectId = function () {
        if (!this.projectId) {
            return NativePromise.resolve('');
        }
        if (this.isObjectId(this.projectId)) {
            return NativePromise.resolve(this.projectId);
        }
        else {
            return this.loadProject().then(function (project) {
                return project._id;
            });
        }
    };
    Formio.prototype.getFormId = function () {
        if (!this.formId) {
            return NativePromise.resolve('');
        }
        if (this.isObjectId(this.formId)) {
            return NativePromise.resolve(this.formId);
        }
        else {
            return this.loadForm().then(function (form) {
                return form._id;
            });
        }
    };
    Formio.prototype.currentUser = function (options) {
        return Formio.currentUser(this, options);
    };
    Formio.prototype.accessInfo = function () {
        return Formio.accessInfo(this);
    };
    /**
     * Returns the JWT token for this instance.
     *
     * @return {*}
     */
    Formio.prototype.getToken = function (options) {
        return Formio.getToken(Object.assign({ formio: this }, this.options, options));
    };
    /**
     * Sets the JWT token for this instance.
     *
     * @return {*}
     */
    Formio.prototype.setToken = function (token, options) {
        return Formio.setToken(token, Object.assign({ formio: this }, this.options, options));
    };
    /**
     * Returns a temporary authentication token for single purpose token generation.
     */
    Formio.prototype.getTempToken = function (expire, allowed, options) {
        var token = Formio.getToken(options);
        if (!token) {
            return NativePromise.reject('You must be authenticated to generate a temporary auth token.');
        }
        var authUrl = Formio.authUrl || this.projectUrl;
        return this.makeRequest('tempToken', authUrl + "/token", 'GET', null, {
            ignoreCache: true,
            header: new Headers({
                'x-expire': expire,
                'x-allow': allowed
            })
        });
    };
    /**
     * Get a download url for a submission PDF of this submission.
     *
     * @return {*}
     */
    Formio.prototype.getDownloadUrl = function (form) {
        var _this = this;
        if (!this.submissionId) {
            return NativePromise.resolve('');
        }
        if (!form) {
            // Make sure to load the form first.
            return this.loadForm().then(function (_form) {
                if (!_form) {
                    return '';
                }
                return _this.getDownloadUrl(_form);
            });
        }
        var apiUrl = "/project/" + form.project;
        apiUrl += "/form/" + form._id;
        apiUrl += "/submission/" + this.submissionId;
        apiUrl += '/download';
        var download = this.base + apiUrl;
        return new NativePromise(function (resolve, reject) {
            _this.getTempToken(3600, "GET:" + apiUrl).then(function (tempToken) {
                download += "?token=" + tempToken.key;
                resolve(download);
            }, function () {
                resolve(download);
            }).catch(reject);
        });
    };
    Formio.prototype.uploadFile = function (storage, file, fileName, dir, progressCallback, url, options, fileKey) {
        var _this = this;
        var requestArgs = {
            provider: storage,
            method: 'upload',
            file: file,
            fileName: fileName,
            dir: dir
        };
        fileKey = fileKey || 'file';
        var request = Formio.pluginWait('preRequest', requestArgs)
            .then(function () {
            return Formio.pluginGet('fileRequest', requestArgs)
                .then(function (result) {
                if (storage && isNil(result)) {
                    var Provider = Providers.getProvider('storage', storage);
                    if (Provider) {
                        var provider = new Provider(_this);
                        return provider.uploadFile(file, fileName, dir, progressCallback, url, options, fileKey);
                    }
                    else {
                        throw ('Storage provider not found');
                    }
                }
                return result || { url: '' };
            });
        });
        return Formio.pluginAlter('wrapFileRequestPromise', request, requestArgs);
    };
    Formio.prototype.downloadFile = function (file, options) {
        var _this = this;
        var requestArgs = {
            method: 'download',
            file: file
        };
        var request = Formio.pluginWait('preRequest', requestArgs)
            .then(function () {
            return Formio.pluginGet('fileRequest', requestArgs)
                .then(function (result) {
                if (file.storage && isNil(result)) {
                    var Provider = Providers.getProvider('storage', file.storage);
                    if (Provider) {
                        var provider = new Provider(_this);
                        return provider.downloadFile(file, options);
                    }
                    else {
                        throw ('Storage provider not found');
                    }
                }
                return result || { url: '' };
            });
        });
        return Formio.pluginAlter('wrapFileRequestPromise', request, requestArgs);
    };
    /**
     * Returns the user permissions to a form and submission.
     *
     * @param user - The user or current user if undefined. For anonymous, use "null"
     * @param form - The form or current form if undefined. For no form check, use "null"
     * @param submission - The submisison or "index" if undefined.
     *
     * @return {create: boolean, read: boolean, edit: boolean, delete: boolean}
     */
    Formio.prototype.userPermissions = function (user, form, submission) {
        return NativePromise.all([
            (form !== undefined) ? NativePromise.resolve(form) : this.loadForm(),
            (user !== undefined) ? NativePromise.resolve(user) : this.currentUser(),
            (submission !== undefined || !this.submissionId) ? NativePromise.resolve(submission) : this.loadSubmission(),
            this.accessInfo()
        ]).then(function (results) {
            var form = results.shift();
            var user = results.shift() || { _id: false, roles: [] };
            var submission = results.shift();
            var access = results.shift();
            var permMap = {
                create: 'create',
                read: 'read',
                update: 'edit',
                delete: 'delete'
            };
            var perms = {
                user: user,
                form: form,
                access: access,
                create: false,
                read: false,
                edit: false,
                delete: false
            };
            for (var roleName in access.roles) {
                if (access.roles.hasOwnProperty(roleName)) {
                    var role = access.roles[roleName];
                    if (role.default && (user._id === false)) {
                        // User is anonymous. Add the anonymous role.
                        user.roles.push(role._id);
                    }
                    else if (role.admin && user.roles.indexOf(role._id) !== -1) {
                        perms.create = true;
                        perms.read = true;
                        perms.delete = true;
                        perms.edit = true;
                        return perms;
                    }
                }
            }
            if (form && form.submissionAccess) {
                for (var i = 0; i < form.submissionAccess.length; i++) {
                    var permission = form.submissionAccess[i];
                    var _a = permission.type.split('_'), perm = _a[0], scope = _a[1];
                    if (['create', 'read', 'update', 'delete'].includes(perm)) {
                        if (_intersection(permission.roles, user.roles).length) {
                            perms[permMap[perm]] = (scope === 'all') || (!submission || (user._id === submission.owner));
                        }
                    }
                }
            }
            // check for Group Permissions
            if (submission) {
                // we would anyway need to loop through components for create permission, so we'll do that for all of them
                eachComponent(form.components, function (component, path) {
                    if (component && component.defaultPermission) {
                        var value = _get(submission.data, path);
                        // make it work for single-select Group and multi-select Group
                        var groups = Array.isArray(value) ? value : [value];
                        groups.forEach(function (group) {
                            if (group && group._id && // group id is present
                                user.roles.indexOf(group._id) > -1 // user has group id in his roles
                            ) {
                                if (component.defaultPermission === 'read') {
                                    perms[permMap.read] = true;
                                }
                                if (component.defaultPermission === 'create') {
                                    perms[permMap.create] = true;
                                    perms[permMap.read] = true;
                                }
                                if (component.defaultPermission === 'write') {
                                    perms[permMap.create] = true;
                                    perms[permMap.read] = true;
                                    perms[permMap.update] = true;
                                }
                                if (component.defaultPermission === 'admin') {
                                    perms[permMap.create] = true;
                                    perms[permMap.read] = true;
                                    perms[permMap.update] = true;
                                    perms[permMap.delete] = true;
                                }
                            }
                        });
                    }
                });
            }
            return perms;
        });
    };
    /**
     * Determine if the current user can submit a form.
     * @return {*}
     */
    Formio.prototype.canSubmit = function () {
        var _this = this;
        return this.userPermissions().then(function (perms) {
            // If there is user and they cannot create, then check anonymous user permissions.
            if (!perms.create && Formio.getUser()) {
                return _this.userPermissions(null).then(function (anonPerms) {
                    if (anonPerms.create) {
                        Formio.setUser(null);
                        return true;
                    }
                    return false;
                });
            }
            return perms.create;
        });
    };
    Formio.prototype.getUrlParts = function (url) {
        return Formio.getUrlParts(url, this);
    };
    Formio.getUrlParts = function (url, formio) {
        var base = (formio && formio.base) ? formio.base : Formio.baseUrl;
        var regex = '^(http[s]?:\\/\\/)';
        if (base && url.indexOf(base) === 0) {
            regex += "(" + base.replace(/^http[s]?:\/\//, '') + ")";
        }
        else {
            regex += '([^/]+)';
        }
        regex += '($|\\/.*)';
        return url.match(new RegExp(regex));
    };
    Formio.serialize = function (obj, _interpolate) {
        var str = [];
        var interpolate = function (item) {
            return _interpolate ? _interpolate(item) : item;
        };
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(interpolate(obj[p])));
            }
        }
        return str.join('&');
    };
    Formio.getRequestArgs = function (formio, type, url, method, data, opts) {
        method = (method || 'GET').toUpperCase();
        if (!opts || !isObject(opts)) {
            opts = {};
        }
        var requestArgs = {
            url: url,
            method: method,
            data: data || null,
            opts: opts
        };
        if (type) {
            requestArgs.type = type;
        }
        if (formio) {
            requestArgs.formio = formio;
        }
        return requestArgs;
    };
    Formio.makeStaticRequest = function (url, method, data, opts) {
        var requestArgs = Formio.getRequestArgs(null, '', url, method, data, opts);
        var request = Formio.pluginWait('preRequest', requestArgs)
            .then(function () { return Formio.pluginGet('staticRequest', requestArgs)
            .then(function (result) {
            if (isNil(result)) {
                return Formio.request(url, method, requestArgs.data, requestArgs.opts.header, requestArgs.opts);
            }
            return result;
        }); });
        return Formio.pluginAlter('wrapStaticRequestPromise', request, requestArgs);
    };
    Formio.makeRequest = function (formio, type, url, method, data, opts) {
        if (!formio) {
            return Formio.makeStaticRequest(url, method, data, opts);
        }
        var requestArgs = Formio.getRequestArgs(formio, type, url, method, data, opts);
        requestArgs.opts = requestArgs.opts || {};
        requestArgs.opts.formio = formio;
        //for Formio requests default Accept and Content-type headers
        if (!requestArgs.opts.headers) {
            requestArgs.opts.headers = {};
        }
        requestArgs.opts.headers = _defaults(requestArgs.opts.headers, {
            'Accept': 'application/json',
            'Content-type': 'application/json'
        });
        var request = Formio.pluginWait('preRequest', requestArgs)
            .then(function () { return Formio.pluginGet('request', requestArgs)
            .then(function (result) {
            if (isNil(result)) {
                return Formio.request(url, method, requestArgs.data, requestArgs.opts.header, requestArgs.opts);
            }
            return result;
        }); });
        return Formio.pluginAlter('wrapRequestPromise', request, requestArgs);
    };
    Formio.request = function (url, method, data, header, opts) {
        if (!url) {
            return NativePromise.reject('No url provided');
        }
        method = (method || 'GET').toUpperCase();
        // For reverse compatibility, if they provided the ignoreCache parameter,
        // then change it back to the options format where that is a parameter.
        if (isBoolean(opts)) {
            opts = { ignoreCache: opts };
        }
        if (!opts || !isObject(opts)) {
            opts = {};
        }
        // Generate a cachekey.
        var cacheKey = btoa(encodeURI(url));
        // Get the cached promise to save multiple loads.
        if (!opts.ignoreCache && method === 'GET' && Formio.cache.hasOwnProperty(cacheKey)) {
            return NativePromise.resolve(cloneResponse(Formio.cache[cacheKey]));
        }
        // Set up and fetch request
        var headers = header || new Headers(opts.headers || {
            'Accept': 'application/json',
            'Content-type': 'application/json'
        });
        var token = Formio.getToken(opts);
        if (token && !opts.noToken) {
            headers.append('x-jwt-token', token);
        }
        // The fetch-ponyfill can't handle a proper Headers class anymore. Change it back to an object.
        var headerObj = {};
        headers.forEach(function (value, name) {
            headerObj[name] = value;
        });
        var options = {
            method: method,
            headers: headerObj,
            mode: 'cors'
        };
        if (data) {
            options.body = JSON.stringify(data);
        }
        // Allow plugins to alter the options.
        options = Formio.pluginAlter('requestOptions', options, url);
        if (options.namespace || Formio.namespace) {
            opts.namespace = options.namespace || Formio.namespace;
        }
        var requestToken = options.headers['x-jwt-token'];
        var result = Formio.pluginAlter('wrapFetchRequestPromise', Formio.fetch(url, options), { url: url, method: method, data: data, opts: opts }).then(function (response) {
            // Allow plugins to respond.
            response = Formio.pluginAlter('requestResponse', response, Formio, data);
            if (!response.ok) {
                if (response.status === 440) {
                    Formio.setToken(null, opts);
                    Formio.events.emit('formio.sessionExpired', response.body);
                }
                else if (response.status === 401) {
                    Formio.events.emit('formio.unauthorized', response.body);
                }
                else if (response.status === 416) {
                    Formio.events.emit('formio.rangeIsNotSatisfiable', response.body);
                }
                // Parse and return the error as a rejected promise to reject this promise
                return (response.headers.get('content-type').includes('application/json')
                    ? response.json()
                    : response.text())
                    .then(function (error) {
                    return NativePromise.reject(error);
                });
            }
            // Handle fetch results
            var token = response.headers.get('x-jwt-token');
            // In some strange cases, the fetch library will return an x-jwt-token without sending
            // one to the server. This has even been debugged on the server to verify that no token
            // was introduced with the request, but the response contains a token. This is an Invalid
            // case where we do not send an x-jwt-token and get one in return for any GET request.
            var tokenIntroduced = false;
            if ((method === 'GET') &&
                !requestToken &&
                token &&
                !opts.external &&
                !url.includes('token=') &&
                !url.includes('x-jwt-token=')) {
                console.warn('Token was introduced in request.');
                tokenIntroduced = true;
            }
            if (response.status >= 200 &&
                response.status < 300 &&
                token &&
                token !== '' &&
                !tokenIntroduced) {
                Formio.setToken(token, opts);
            }
            // 204 is no content. Don't try to .json() it.
            if (response.status === 204) {
                return {};
            }
            var getResult = response.headers.get('content-type').includes('application/json')
                ? response.json()
                : response.text();
            return getResult.then(function (result) {
                // Add some content-range metadata to the result here
                var range = response.headers.get('content-range');
                if (range && isObject(result)) {
                    range = range.split('/');
                    if (range[0] !== '*') {
                        var skipLimit = range[0].split('-');
                        result.skip = Number(skipLimit[0]);
                        result.limit = skipLimit[1] - skipLimit[0] + 1;
                    }
                    result.serverCount = range[1] === '*' ? range[1] : Number(range[1]);
                }
                if (!opts.getHeaders) {
                    return result;
                }
                var headers = {};
                response.headers.forEach(function (item, key) {
                    headers[key] = item;
                });
                // Return the result with the headers.
                return {
                    result: result,
                    headers: headers,
                };
            });
        })
            .then(function (result) {
            if (opts.getHeaders) {
                return result;
            }
            // Cache the response.
            if (method === 'GET') {
                Formio.cache[cacheKey] = result;
            }
            return cloneResponse(result);
        })
            .catch(function (err) {
            if (err === 'Bad Token') {
                Formio.setToken(null, opts);
                Formio.events.emit('formio.badToken', err);
            }
            if (err.message) {
                err.message = "Could not connect to API server (" + err.message + ")";
                err.networkError = true;
            }
            if (method === 'GET') {
                delete Formio.cache[cacheKey];
            }
            return NativePromise.reject(err);
        });
        return result;
    };
    Object.defineProperty(Formio, "token", {
        // Needed to maintain reverse compatability...
        get: function () {
            if (!Formio.tokens) {
                Formio.tokens = {};
            }
            return Formio.tokens.formioToken ? Formio.tokens.formioToken : '';
        },
        // Needed to maintain reverse compatability...
        set: function (token) {
            if (!Formio.tokens) {
                Formio.tokens = {};
            }
            return Formio.tokens.formioToken = token || '';
        },
        enumerable: false,
        configurable: true
    });
    Formio.setToken = function (token, opts) {
        if (token === void 0) { token = ''; }
        token = token || '';
        opts = (typeof opts === 'string') ? { namespace: opts } : opts || {};
        var tokenName = (opts.namespace || Formio.namespace || 'formio') + "Token";
        if (!Formio.tokens) {
            Formio.tokens = {};
        }
        if (Formio.tokens[tokenName] && Formio.tokens[tokenName] === token) {
            return;
        }
        Formio.tokens[tokenName] = token;
        if (!token) {
            if (!opts.fromUser) {
                opts.fromToken = true;
                Formio.setUser(null, opts);
            }
            // iOS in private browse mode will throw an error but we can't detect ahead of time that we are in private mode.
            try {
                return localStorage.removeItem(tokenName);
            }
            catch (err) {
                return cookies.erase(tokenName, { path: '/' });
            }
        }
        // iOS in private browse mode will throw an error but we can't detect ahead of time that we are in private mode.
        try {
            localStorage.setItem(tokenName, token);
        }
        catch (err) {
            cookies.set(tokenName, token, { path: '/' });
        }
        return Formio.currentUser(opts.formio, opts); // Run this so user is updated if null
    };
    Formio.getToken = function (options) {
        options = (typeof options === 'string') ? { namespace: options } : options || {};
        var tokenName = (options.namespace || Formio.namespace || 'formio') + "Token";
        var decodedTokenName = options.decode ? tokenName + "Decoded" : tokenName;
        if (!Formio.tokens) {
            Formio.tokens = {};
        }
        if (Formio.tokens[decodedTokenName]) {
            return Formio.tokens[decodedTokenName];
        }
        try {
            Formio.tokens[tokenName] = localStorage.getItem(tokenName) || '';
            if (options.decode) {
                Formio.tokens[decodedTokenName] = Formio.tokens[tokenName] ? jwtDecode(Formio.tokens[tokenName]) : {};
                return Formio.tokens[decodedTokenName];
            }
            return Formio.tokens[tokenName];
        }
        catch (e) {
            Formio.tokens[tokenName] = cookies.get(tokenName);
            return Formio.tokens[tokenName];
        }
    };
    Formio.setUser = function (user, opts) {
        if (opts === void 0) { opts = {}; }
        var userName = (opts.namespace || Formio.namespace || 'formio') + "User";
        if (!user) {
            if (!opts.fromToken) {
                opts.fromUser = true;
                Formio.setToken(null, opts);
            }
            // Emit an event on the cleared user.
            Formio.events.emit('formio.user', null);
            // iOS in private browse mode will throw an error but we can't detect ahead of time that we are in private mode.
            try {
                return localStorage.removeItem(userName);
            }
            catch (err) {
                return cookies.erase(userName, { path: '/' });
            }
        }
        // iOS in private browse mode will throw an error but we can't detect ahead of time that we are in private mode.
        try {
            localStorage.setItem(userName, JSON.stringify(user));
        }
        catch (err) {
            cookies.set(userName, JSON.stringify(user), { path: '/' });
        }
        // Emit an event on the authenticated user.
        Formio.events.emit('formio.user', user);
    };
    Formio.getUser = function (options) {
        options = options || {};
        var userName = (options.namespace || Formio.namespace || 'formio') + "User";
        try {
            return JSON.parse(localStorage.getItem(userName) || null);
        }
        catch (e) {
            return JSON.parse(cookies.get(userName));
        }
    };
    Formio.setBaseUrl = function (url) {
        Formio.baseUrl = url;
        if (!Formio.projectUrlSet) {
            Formio.projectUrl = url;
        }
    };
    Formio.getBaseUrl = function () {
        return Formio.baseUrl;
    };
    Formio.setApiUrl = function (url) {
        return Formio.setBaseUrl(url);
    };
    Formio.getApiUrl = function () {
        return Formio.getBaseUrl();
    };
    Formio.setAppUrl = function (url) {
        console.warn('Formio.setAppUrl() is deprecated. Use Formio.setProjectUrl instead.');
        Formio.projectUrl = url;
        Formio.projectUrlSet = true;
    };
    Formio.setProjectUrl = function (url) {
        Formio.projectUrl = url;
        Formio.projectUrlSet = true;
    };
    Formio.setAuthUrl = function (url) {
        Formio.authUrl = url;
    };
    Formio.getAppUrl = function () {
        console.warn('Formio.getAppUrl() is deprecated. Use Formio.getProjectUrl instead.');
        return Formio.projectUrl;
    };
    Formio.getProjectUrl = function () {
        return Formio.projectUrl;
    };
    Formio.clearCache = function () {
        Formio.cache = {};
    };
    Formio.noop = function () { };
    Formio.identity = function (value) {
        return value;
    };
    Formio.deregisterPlugin = function (plugin) {
        var beforeLength = Formio.plugins.length;
        Formio.plugins = Formio.plugins.filter(function (p) {
            if (p !== plugin && p.__name !== plugin) {
                return true;
            }
            (p.deregister || Formio.noop).call(plugin, Formio);
            return false;
        });
        return beforeLength !== Formio.plugins.length;
    };
    Formio.registerPlugin = function (plugin, name) {
        Formio.plugins.push(plugin);
        Formio.plugins.sort(function (a, b) { return (b.priority || 0) - (a.priority || 0); });
        plugin.__name = name;
        (plugin.init || Formio.noop).call(plugin, Formio);
    };
    Formio.getPlugin = function (name) {
        for (var _i = 0, _a = Formio.plugins; _i < _a.length; _i++) {
            var plugin = _a[_i];
            if (plugin.__name === name) {
                return plugin;
            }
        }
        return null;
    };
    Formio.pluginWait = function (pluginFn) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return NativePromise.all(Formio.plugins.map(function (plugin) {
            var _a;
            return (_a = (plugin[pluginFn] || Formio.noop)).call.apply(_a, __spreadArrays([plugin], args));
        }));
    };
    Formio.pluginGet = function (pluginFn) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var callPlugin = function (index) {
            var _a;
            var plugin = Formio.plugins[index];
            if (!plugin) {
                return NativePromise.resolve(null);
            }
            return NativePromise.resolve((_a = (plugin[pluginFn] || Formio.noop)).call.apply(_a, __spreadArrays([plugin], args)))
                .then(function (result) {
                if (!isNil(result)) {
                    return result;
                }
                return callPlugin(index + 1);
            });
        };
        return callPlugin(0);
    };
    Formio.pluginAlter = function (pluginFn, value) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        return Formio.plugins.reduce(function (value, plugin) {
            return (plugin[pluginFn] || Formio.identity).apply(void 0, __spreadArrays([value], args));
        }, value);
    };
    Formio.accessInfo = function (formio) {
        var projectUrl = formio ? formio.projectUrl : Formio.projectUrl;
        return Formio.makeRequest(formio, 'accessInfo', projectUrl + "/access");
    };
    Formio.projectRoles = function (formio) {
        var projectUrl = formio ? formio.projectUrl : Formio.projectUrl;
        return Formio.makeRequest(formio, 'projectRoles', projectUrl + "/role");
    };
    Formio.currentUser = function (formio, options) {
        var authUrl = Formio.authUrl;
        if (!authUrl) {
            authUrl = formio ? formio.projectUrl : (Formio.projectUrl || Formio.baseUrl);
        }
        authUrl += '/current';
        var user = Formio.getUser(options);
        if (user) {
            return Formio.pluginAlter('wrapStaticRequestPromise', NativePromise.resolve(user), {
                url: authUrl,
                method: 'GET',
                options: options
            });
        }
        var token = Formio.getToken(options);
        if ((!options || !options.external) && !token) {
            return Formio.pluginAlter('wrapStaticRequestPromise', NativePromise.resolve(null), {
                url: authUrl,
                method: 'GET',
                options: options
            });
        }
        return Formio.makeRequest(formio, 'currentUser', authUrl, 'GET', null, options)
            .then(function (response) {
            Formio.setUser(response, options);
            return response;
        });
    };
    Formio.logout = function (formio, options) {
        options = options || {};
        options.formio = formio;
        Formio.setToken(null, options);
        Formio.setUser(null, options);
        Formio.clearCache();
        var projectUrl = Formio.authUrl ? Formio.authUrl : (formio ? formio.projectUrl : Formio.baseUrl);
        return Formio.makeRequest(formio, 'logout', projectUrl + "/logout");
    };
    Formio.pageQuery = function () {
        var pageQuery = {};
        pageQuery.paths = [];
        var hashes = location.hash.substr(1).replace(/\?/g, '&').split('&');
        var parts = [];
        location.search.substr(1).split('&').forEach(function (item) {
            parts = item.split('=');
            if (parts.length > 1) {
                pageQuery[parts[0]] = parts[1] && decodeURIComponent(parts[1]);
            }
        });
        hashes.forEach(function (item) {
            parts = item.split('=');
            if (parts.length > 1) {
                pageQuery[parts[0]] = parts[1] && decodeURIComponent(parts[1]);
            }
            else if (item.indexOf('/') === 0) {
                pageQuery.paths = item.substr(1).split('/');
            }
        });
        return pageQuery;
    };
    Formio.oAuthCurrentUser = function (formio, token) {
        return Formio.currentUser(formio, {
            external: true,
            headers: {
                Authorization: "Bearer " + token
            }
        });
    };
    Formio.samlInit = function (options) {
        options = options || {};
        var query = Formio.pageQuery();
        if (query.saml) {
            Formio.setUser(null);
            var retVal = Formio.setToken(query.saml);
            var uri = window.location.toString();
            uri = uri.substring(0, uri.indexOf('?'));
            if (window.location.hash) {
                uri += window.location.hash;
            }
            window.history.replaceState({}, document.title, uri);
            return retVal;
        }
        // Set the relay if not provided.
        if (!options.relay) {
            options.relay = window.location.href;
        }
        // go to the saml sso endpoint for this project.
        var authUrl = Formio.authUrl || Formio.projectUrl;
        window.location.href = authUrl + "/saml/sso?relay=" + encodeURI(options.relay);
        return false;
    };
    Formio.oktaInit = function (options) {
        options = options || {};
        if (typeof OktaAuth !== undefined) {
            options.OktaAuth = OktaAuth;
        }
        if (typeof options.OktaAuth === undefined) {
            var errorMessage = 'Cannot find OktaAuth. Please include the Okta JavaScript SDK within your application. See https://developer.okta.com/code/javascript/okta_auth_sdk for an example.';
            console.warn(errorMessage);
            return NativePromise.reject(errorMessage);
        }
        return new NativePromise(function (resolve, reject) {
            var Okta = options.OktaAuth;
            delete options.OktaAuth;
            var authClient = new Okta(options);
            authClient.tokenManager.get('accessToken')
                .then(function (accessToken) {
                if (accessToken) {
                    resolve(Formio.oAuthCurrentUser(options.formio, accessToken.accessToken));
                }
                else if (location.hash) {
                    authClient.token.parseFromUrl()
                        .then(function (token) {
                        authClient.tokenManager.add('accessToken', token);
                        resolve(Formio.oAuthCurrentUser(options.formio, token.accessToken));
                    })
                        .catch(function (err) {
                        console.warn(err);
                        reject(err);
                    });
                }
                else {
                    authClient.token.getWithRedirect({
                        responseType: 'token',
                        scopes: options.scopes
                    });
                    resolve(false);
                }
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    Formio.ssoInit = function (type, options) {
        switch (type) {
            case 'saml':
                return Formio.samlInit(options);
            case 'okta':
                return Formio.oktaInit(options);
            default:
                console.warn('Unknown SSO type');
                return NativePromise.reject('Unknown SSO type');
        }
    };
    Formio.requireLibrary = function (name, property, src, polling) {
        if (!Formio.libraries.hasOwnProperty(name)) {
            Formio.libraries[name] = {};
            Formio.libraries[name].ready = new NativePromise(function (resolve, reject) {
                Formio.libraries[name].resolve = resolve;
                Formio.libraries[name].reject = reject;
            });
            var callbackName = name + "Callback";
            if (!polling && !window[callbackName]) {
                window[callbackName] = function () { return Formio.libraries[name].resolve(); };
            }
            // See if the plugin already exists.
            var plugin = _get(window, property);
            if (plugin) {
                Formio.libraries[name].resolve(plugin);
            }
            else {
                src = Array.isArray(src) ? src : [src];
                src.forEach(function (lib) {
                    var attrs = {};
                    var elementType = '';
                    if (typeof lib === 'string') {
                        lib = {
                            type: 'script',
                            src: lib,
                        };
                    }
                    switch (lib.type) {
                        case 'script':
                            elementType = 'script';
                            attrs = {
                                src: lib.src,
                                type: 'text/javascript',
                                defer: true,
                                async: true,
                                referrerpolicy: 'origin',
                            };
                            break;
                        case 'styles':
                            elementType = 'link';
                            attrs = {
                                href: lib.src,
                                rel: 'stylesheet',
                            };
                            break;
                    }
                    // Add the script to the top of the page.
                    var element = document.createElement(elementType);
                    if (element.setAttribute) {
                        for (var attr in attrs) {
                            element.setAttribute(attr, attrs[attr]);
                        }
                    }
                    var head = document.head;
                    if (head) {
                        head.appendChild(element);
                    }
                });
                // if no callback is provided, then check periodically for the script.
                if (polling) {
                    var interval_1 = setInterval(function () {
                        var plugin = _get(window, property);
                        if (plugin) {
                            clearInterval(interval_1);
                            Formio.libraries[name].resolve(plugin);
                        }
                    }, 200);
                }
            }
        }
        return Formio.libraries[name].ready;
    };
    Formio.libraryReady = function (name) {
        if (Formio.libraries.hasOwnProperty(name) &&
            Formio.libraries[name].ready) {
            return Formio.libraries[name].ready;
        }
        return NativePromise.reject(name + " library was not required.");
    };
    Formio.addToGlobal = function (global) {
        if (typeof global === 'object' && !global.Formio) {
            global.Formio = Formio;
        }
    };
    return Formio;
}());
export { Formio };
// Define all the static properties.
Formio.libraries = {};
Formio.Promise = NativePromise;
Formio.fetch = fetch;
Formio.Headers = Headers;
Formio.baseUrl = 'https://api.form.io';
Formio.projectUrl = Formio.baseUrl;
Formio.authUrl = '';
Formio.projectUrlSet = false;
Formio.plugins = [];
Formio.cache = {};
Formio.Providers = Providers;
Formio.version = '---VERSION---';
Formio.events = new EventEmitter({
    wildcard: false,
    maxListeners: 0
});
if (typeof global !== 'undefined') {
    Formio.addToGlobal(global);
}
if (typeof window !== 'undefined') {
    Formio.addToGlobal(window);
}