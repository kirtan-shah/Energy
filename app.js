(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

function expect(val, message) {
    if (val === null || val === undefined) throw new Error(message);
    return val;
}
function unreachable(message = "unreachable") {
    return new Error(message);
}

// import Logger from './logger';
// let alreadyWarned = false;
function debugAssert(test, msg) {
    // if (!alreadyWarned) {
    //   alreadyWarned = true;
    //   Logger.warn("Don't leave debug assertions on in public builds");
    // }
    if (!test) {
        throw new Error(msg || "assertion failure");
    }
}

const objKeys = Object.keys;

function assign(obj) {
    for (let i = 1; i < arguments.length; i++) {
        let assignment = arguments[i];
        if (assignment === null || typeof assignment !== 'object') continue;
        let keys = objKeys(assignment);
        for (let j = 0; j < keys.length; j++) {
            let key = keys[j];
            obj[key] = assignment[key];
        }
    }
    return obj;
}
function fillNulls(count) {
    let arr = new Array(count);
    for (let i = 0; i < count; i++) {
        arr[i] = null;
    }
    return arr;
}

let GUID = 0;
function initializeGuid(object) {
    return object._guid = ++GUID;
}
function ensureGuid(object) {
    return object._guid || initializeGuid(object);
}

function dict() {
    return Object.create(null);
}

class Stack {
    constructor() {
        this.stack = [];
        this.current = null;
    }
    get size() {
        return this.stack.length;
    }
    push(item) {
        this.current = item;
        this.stack.push(item);
    }
    pop() {
        let item = this.stack.pop();
        let len = this.stack.length;
        this.current = len === 0 ? null : this.stack[len - 1];
        return item === undefined ? null : item;
    }
    isEmpty() {
        return this.stack.length === 0;
    }
}

class ListNode {
    constructor(value) {
        this.next = null;
        this.prev = null;
        this.value = value;
    }
}
class LinkedList {
    constructor() {
        this.clear();
    }
    head() {
        return this._head;
    }
    tail() {
        return this._tail;
    }
    clear() {
        this._head = this._tail = null;
    }
    toArray() {
        let out = [];
        this.forEachNode(n => out.push(n));
        return out;
    }
    nextNode(node) {
        return node.next;
    }
    forEachNode(callback) {
        let node = this._head;
        while (node !== null) {
            callback(node);
            node = node.next;
        }
    }
    insertBefore(node, reference = null) {
        if (reference === null) return this.append(node);
        if (reference.prev) reference.prev.next = node;else this._head = node;
        node.prev = reference.prev;
        node.next = reference;
        reference.prev = node;
        return node;
    }
    append(node) {
        let tail = this._tail;
        if (tail) {
            tail.next = node;
            node.prev = tail;
            node.next = null;
        } else {
            this._head = node;
        }
        return this._tail = node;
    }
    remove(node) {
        if (node.prev) node.prev.next = node.next;else this._head = node.next;
        if (node.next) node.next.prev = node.prev;else this._tail = node.prev;
        return node;
    }
}
class ListSlice {
    constructor(head, tail) {
        this._head = head;
        this._tail = tail;
    }
    forEachNode(callback) {
        let node = this._head;
        while (node !== null) {
            callback(node);
            node = this.nextNode(node);
        }
    }
    head() {
        return this._head;
    }
    tail() {
        return this._tail;
    }
    toArray() {
        let out = [];
        this.forEachNode(n => out.push(n));
        return out;
    }
    nextNode(node) {
        if (node === this._tail) return null;
        return node.next;
    }
}
const EMPTY_SLICE = new ListSlice(null, null);

const EMPTY_ARRAY = Object.freeze([]);

const CONSTANT = 0;
const INITIAL = 1;
const VOLATILE = NaN;
class RevisionTag {
    validate(snapshot) {
        return this.value() === snapshot;
    }
}
RevisionTag.id = 0;
const VALUE = [];
const VALIDATE = [];
class TagWrapper {
    constructor(type, inner) {
        this.type = type;
        this.inner = inner;
    }
    value() {
        let func = VALUE[this.type];
        return func(this.inner);
    }
    validate(snapshot) {
        let func = VALIDATE[this.type];
        return func(this.inner, snapshot);
    }
}
function register(Type) {
    let type = VALUE.length;
    VALUE.push(tag => tag.value());
    VALIDATE.push((tag, snapshot) => tag.validate(snapshot));
    Type.id = type;
}
///
// CONSTANT: 0
VALUE.push(() => CONSTANT);
VALIDATE.push((_tag, snapshot) => snapshot === CONSTANT);
const CONSTANT_TAG = new TagWrapper(0, null);
// VOLATILE: 1
VALUE.push(() => VOLATILE);
VALIDATE.push((_tag, snapshot) => snapshot === VOLATILE);
const VOLATILE_TAG = new TagWrapper(1, null);
// CURRENT: 2
VALUE.push(() => $REVISION);
VALIDATE.push((_tag, snapshot) => snapshot === $REVISION);
const CURRENT_TAG = new TagWrapper(2, null);
function isConst({ tag }) {
    return tag === CONSTANT_TAG;
}
function isConstTag(tag) {
    return tag === CONSTANT_TAG;
}
///
let $REVISION = INITIAL;
class DirtyableTag extends RevisionTag {
    static create(revision = $REVISION) {
        return new TagWrapper(this.id, new DirtyableTag(revision));
    }
    constructor(revision = $REVISION) {
        super();
        this.revision = revision;
    }
    value() {
        return this.revision;
    }
    dirty() {
        this.revision = ++$REVISION;
    }
}
register(DirtyableTag);
function combineTagged(tagged) {
    let optimized = [];
    for (let i = 0, l = tagged.length; i < l; i++) {
        let tag = tagged[i].tag;
        if (tag === VOLATILE_TAG) return VOLATILE_TAG;
        if (tag === CONSTANT_TAG) continue;
        optimized.push(tag);
    }
    return _combine(optimized);
}
function combineSlice(slice) {
    let optimized = [];
    let node = slice.head();
    while (node !== null) {
        let tag = node.tag;
        if (tag === VOLATILE_TAG) return VOLATILE_TAG;
        if (tag !== CONSTANT_TAG) optimized.push(tag);
        node = slice.nextNode(node);
    }
    return _combine(optimized);
}
function combine(tags) {
    let optimized = [];
    for (let i = 0, l = tags.length; i < l; i++) {
        let tag = tags[i];
        if (tag === VOLATILE_TAG) return VOLATILE_TAG;
        if (tag === CONSTANT_TAG) continue;
        optimized.push(tag);
    }
    return _combine(optimized);
}
function _combine(tags) {
    switch (tags.length) {
        case 0:
            return CONSTANT_TAG;
        case 1:
            return tags[0];
        case 2:
            return TagsPair.create(tags[0], tags[1]);
        default:
            return TagsCombinator.create(tags);
    }
}
class CachedTag extends RevisionTag {
    constructor() {
        super(...arguments);
        this.lastChecked = null;
        this.lastValue = null;
    }
    value() {
        let lastChecked = this.lastChecked,
            lastValue = this.lastValue;

        if (lastChecked !== $REVISION) {
            this.lastChecked = $REVISION;
            this.lastValue = lastValue = this.compute();
        }
        return this.lastValue;
    }
    invalidate() {
        this.lastChecked = null;
    }
}
class TagsPair extends CachedTag {
    static create(first, second) {
        return new TagWrapper(this.id, new TagsPair(first, second));
    }
    constructor(first, second) {
        super();
        this.first = first;
        this.second = second;
    }
    compute() {
        return Math.max(this.first.value(), this.second.value());
    }
}
register(TagsPair);
class TagsCombinator extends CachedTag {
    static create(tags) {
        return new TagWrapper(this.id, new TagsCombinator(tags));
    }
    constructor(tags) {
        super();
        this.tags = tags;
    }
    compute() {
        let tags = this.tags;

        let max = -1;
        for (let i = 0; i < tags.length; i++) {
            let value = tags[i].value();
            max = Math.max(value, max);
        }
        return max;
    }
}
register(TagsCombinator);
class UpdatableTag extends CachedTag {
    static create(tag) {
        return new TagWrapper(this.id, new UpdatableTag(tag));
    }
    constructor(tag) {
        super();
        this.tag = tag;
        this.lastUpdated = INITIAL;
    }
    compute() {
        return Math.max(this.lastUpdated, this.tag.value());
    }
    update(tag) {
        if (tag !== this.tag) {
            this.tag = tag;
            this.lastUpdated = $REVISION;
            this.invalidate();
        }
    }
}
register(UpdatableTag);
class CachedReference {
    constructor() {
        this.lastRevision = null;
        this.lastValue = null;
    }
    value() {
        let tag = this.tag,
            lastRevision = this.lastRevision,
            lastValue = this.lastValue;

        if (lastRevision === null || !tag.validate(lastRevision)) {
            lastValue = this.lastValue = this.compute();
            this.lastRevision = tag.value();
        }
        return lastValue;
    }
    invalidate() {
        this.lastRevision = null;
    }
}

//////////
class ReferenceCache {
    constructor(reference) {
        this.lastValue = null;
        this.lastRevision = null;
        this.initialized = false;
        this.tag = reference.tag;
        this.reference = reference;
    }
    peek() {
        if (!this.initialized) {
            return this.initialize();
        }
        return this.lastValue;
    }
    revalidate() {
        if (!this.initialized) {
            return this.initialize();
        }
        let reference = this.reference,
            lastRevision = this.lastRevision;

        let tag = reference.tag;
        if (tag.validate(lastRevision)) return NOT_MODIFIED;
        this.lastRevision = tag.value();
        let lastValue = this.lastValue;

        let value = reference.value();
        if (value === lastValue) return NOT_MODIFIED;
        this.lastValue = value;
        return value;
    }
    initialize() {
        let reference = this.reference;

        let value = this.lastValue = reference.value();
        this.lastRevision = reference.tag.value();
        this.initialized = true;
        return value;
    }
}
const NOT_MODIFIED = "adb3b78e-3d22-4e4b-877a-6317c2c5c145";
function isModified(value) {
    return value !== NOT_MODIFIED;
}

class ConstReference {
    constructor(inner) {
        this.inner = inner;
        this.tag = CONSTANT_TAG;
    }
    value() {
        return this.inner;
    }
}

class ListItem extends ListNode {
    constructor(iterable, result) {
        super(iterable.valueReferenceFor(result));
        this.retained = false;
        this.seen = false;
        this.key = result.key;
        this.iterable = iterable;
        this.memo = iterable.memoReferenceFor(result);
    }
    update(item) {
        this.retained = true;
        this.iterable.updateValueReference(this.value, item);
        this.iterable.updateMemoReference(this.memo, item);
    }
    shouldRemove() {
        return !this.retained;
    }
    reset() {
        this.retained = false;
        this.seen = false;
    }
}
class IterationArtifacts {
    constructor(iterable) {
        this.iterator = null;
        this.map = dict();
        this.list = new LinkedList();
        this.tag = iterable.tag;
        this.iterable = iterable;
    }
    isEmpty() {
        let iterator = this.iterator = this.iterable.iterate();
        return iterator.isEmpty();
    }
    iterate() {
        let iterator;
        if (this.iterator === null) {
            iterator = this.iterable.iterate();
        } else {
            iterator = this.iterator;
        }
        this.iterator = null;
        return iterator;
    }
    has(key) {
        return !!this.map[key];
    }
    get(key) {
        return this.map[key];
    }
    wasSeen(key) {
        let node = this.map[key];
        return node !== undefined && node.seen;
    }
    append(item) {
        let map = this.map,
            list = this.list,
            iterable = this.iterable;

        let node = map[item.key] = new ListItem(iterable, item);
        list.append(node);
        return node;
    }
    insertBefore(item, reference) {
        let map = this.map,
            list = this.list,
            iterable = this.iterable;

        let node = map[item.key] = new ListItem(iterable, item);
        node.retained = true;
        list.insertBefore(node, reference);
        return node;
    }
    move(item, reference) {
        let list = this.list;

        item.retained = true;
        list.remove(item);
        list.insertBefore(item, reference);
    }
    remove(item) {
        let list = this.list;

        list.remove(item);
        delete this.map[item.key];
    }
    nextNode(item) {
        return this.list.nextNode(item);
    }
    head() {
        return this.list.head();
    }
}
class ReferenceIterator {
    // if anyone needs to construct this object with something other than
    // an iterable, let @wycats know.
    constructor(iterable) {
        this.iterator = null;
        let artifacts = new IterationArtifacts(iterable);
        this.artifacts = artifacts;
    }
    next() {
        let artifacts = this.artifacts;

        let iterator = this.iterator = this.iterator || artifacts.iterate();
        let item = iterator.next();
        if (item === null) return null;
        return artifacts.append(item);
    }
}
var Phase;
(function (Phase) {
    Phase[Phase["Append"] = 0] = "Append";
    Phase[Phase["Prune"] = 1] = "Prune";
    Phase[Phase["Done"] = 2] = "Done";
})(Phase || (Phase = {}));
class IteratorSynchronizer {
    constructor({ target, artifacts }) {
        this.target = target;
        this.artifacts = artifacts;
        this.iterator = artifacts.iterate();
        this.current = artifacts.head();
    }
    sync() {
        let phase = Phase.Append;
        while (true) {
            switch (phase) {
                case Phase.Append:
                    phase = this.nextAppend();
                    break;
                case Phase.Prune:
                    phase = this.nextPrune();
                    break;
                case Phase.Done:
                    this.nextDone();
                    return;
            }
        }
    }
    advanceToKey(key) {
        let current = this.current,
            artifacts = this.artifacts;

        let seek = current;
        while (seek !== null && seek.key !== key) {
            seek.seen = true;
            seek = artifacts.nextNode(seek);
        }
        if (seek !== null) {
            this.current = artifacts.nextNode(seek);
        }
    }
    nextAppend() {
        let iterator = this.iterator,
            current = this.current,
            artifacts = this.artifacts;

        let item = iterator.next();
        if (item === null) {
            return this.startPrune();
        }
        let key = item.key;

        if (current !== null && current.key === key) {
            this.nextRetain(item);
        } else if (artifacts.has(key)) {
            this.nextMove(item);
        } else {
            this.nextInsert(item);
        }
        return Phase.Append;
    }
    nextRetain(item) {
        let artifacts = this.artifacts,
            current = this.current;

        current = current;
        current.update(item);
        this.current = artifacts.nextNode(current);
        this.target.retain(item.key, current.value, current.memo);
    }
    nextMove(item) {
        let current = this.current,
            artifacts = this.artifacts,
            target = this.target;
        let key = item.key;

        let found = artifacts.get(item.key);
        found.update(item);
        if (artifacts.wasSeen(item.key)) {
            artifacts.move(found, current);
            target.move(found.key, found.value, found.memo, current ? current.key : null);
        } else {
            this.advanceToKey(key);
        }
    }
    nextInsert(item) {
        let artifacts = this.artifacts,
            target = this.target,
            current = this.current;

        let node = artifacts.insertBefore(item, current);
        target.insert(node.key, node.value, node.memo, current ? current.key : null);
    }
    startPrune() {
        this.current = this.artifacts.head();
        return Phase.Prune;
    }
    nextPrune() {
        let artifacts = this.artifacts,
            target = this.target,
            current = this.current;

        if (current === null) {
            return Phase.Done;
        }
        let node = current;
        this.current = artifacts.nextNode(node);
        if (node.shouldRemove()) {
            artifacts.remove(node);
            target.delete(node.key);
        } else {
            node.reset();
        }
        return Phase.Prune;
    }
    nextDone() {
        this.target.done();
    }
}

function tracked(...dependencies) {
    let target = dependencies[0],
        key = dependencies[1],
        descriptor = dependencies[2];

    if (typeof target === "string") {
        return function (target, key, descriptor) {
            return descriptorForTrackedComputedProperty(target, key, descriptor, dependencies);
        };
    } else {
        if (descriptor) {
            return descriptorForTrackedComputedProperty(target, key, descriptor, []);
        } else {
            installTrackedProperty(target, key);
        }
    }
}
function descriptorForTrackedComputedProperty(target, key, descriptor, dependencies) {
    let meta = metaFor(target);
    meta.trackedProperties[key] = true;
    meta.trackedPropertyDependencies[key] = dependencies || [];
    return {
        enumerable: true,
        configurable: false,
        get: descriptor.get,
        set: function set() {
            metaFor(this).dirtyableTagFor(key).inner.dirty();
            descriptor.set.apply(this, arguments);
            propertyDidChange();
        }
    };
}
/**
  Installs a getter/setter for change tracking. The accessor
  acts just like a normal property, but it triggers the `propertyDidChange`
  hook when written to.

  Values are saved on the object using a "shadow key," or a symbol based on the
  tracked property name. Sets write the value to the shadow key, and gets read
  from it.
 */
function installTrackedProperty(target, key) {
    let value;
    let shadowKey = Symbol(key);
    let meta = metaFor(target);
    meta.trackedProperties[key] = true;
    if (target[key] !== undefined) {
        value = target[key];
    }
    Object.defineProperty(target, key, {
        configurable: true,
        get() {
            return this[shadowKey];
        },
        set(newValue) {
            metaFor(this).dirtyableTagFor(key).inner.dirty();
            this[shadowKey] = newValue;
            propertyDidChange();
        }
    });
}
/**
 * Stores bookkeeping information about tracked properties on the target object
 * and includes helper methods for manipulating and retrieving that data.
 *
 * Computed properties (i.e., tracked getters/setters) deserve some explanation.
 * A computed property is invalidated when either it is set, or one of its
 * dependencies is invalidated. Therefore, we store two tags for each computed
 * property:
 *
 * 1. The dirtyable tag that we invalidate when the setter is invoked.
 * 2. A union tag (tag combinator) of the dirtyable tag and all of the computed
 *    property's dependencies' tags, used by Glimmer to determine "does this
 *    computed property need to be recomputed?"
 */
class Meta {
    constructor(parent) {
        this.tags = dict();
        this.computedPropertyTags = dict();
        this.trackedProperties = parent ? Object.create(parent.trackedProperties) : dict();
        this.trackedPropertyDependencies = parent ? Object.create(parent.trackedPropertyDependencies) : dict();
    }
    /**
     * The tag representing whether the given property should be recomputed. Used
     * by e.g. Glimmer VM to detect when a property should be re-rendered. Think
     * of this as the "public-facing" tag.
     *
     * For static tracked properties, this is a single DirtyableTag. For computed
     * properties, it is a combinator of the property's DirtyableTag as well as
     * all of its dependencies' tags.
     */
    tagFor(key) {
        let tag = this.tags[key];
        if (tag) {
            return tag;
        }
        let dependencies;
        if (dependencies = this.trackedPropertyDependencies[key]) {
            return this.tags[key] = combinatorForComputedProperties(this, key, dependencies);
        }
        return this.tags[key] = DirtyableTag.create();
    }
    /**
     * The tag used internally to invalidate when a tracked property is set. For
     * static properties, this is the same DirtyableTag returned from `tagFor`.
     * For computed properties, it is the DirtyableTag used as one of the tags in
     * the tag combinator of the CP and its dependencies.
    */
    dirtyableTagFor(key) {
        let dependencies = this.trackedPropertyDependencies[key];
        let tag;
        if (dependencies) {
            // The key is for a computed property.
            tag = this.computedPropertyTags[key];
            if (tag) {
                return tag;
            }
            return this.computedPropertyTags[key] = DirtyableTag.create();
        } else {
            // The key is for a static property.
            tag = this.tags[key];
            if (tag) {
                return tag;
            }
            return this.tags[key] = DirtyableTag.create();
        }
    }
}
function combinatorForComputedProperties(meta, key, dependencies) {
    // Start off with the tag for the CP's own dirty state.
    let tags = [meta.dirtyableTagFor(key)];
    // Next, add in all of the tags for its dependencies.
    if (dependencies && dependencies.length) {
        for (let i = 0; i < dependencies.length; i++) {
            tags.push(meta.tagFor(dependencies[i]));
        }
    }
    // Return a combinator across the CP's tags and its dependencies' tags.
    return combine(tags);
}
let META = Symbol("ember-object");
function metaFor(obj) {
    let meta = obj[META];
    if (meta && hasOwnProperty(obj, META)) {
        return meta;
    }
    return obj[META] = new Meta(meta);
}
let hOP = Object.prototype.hasOwnProperty;
function hasOwnProperty(obj, key) {
    return hOP.call(obj, key);
}
let propertyDidChange = function propertyDidChange() {};
function setPropertyDidChange(cb) {
    propertyDidChange = cb;
}
function hasTag(obj, key) {
    let meta = obj[META];
    if (!obj[META]) {
        return false;
    }
    if (!meta.trackedProperties[key]) {
        return false;
    }
    return true;
}
class UntrackedPropertyError extends Error {
    constructor(target, key, message) {
        super(message);
        this.target = target;
        this.key = key;
    }
    static for(obj, key) {
        return new UntrackedPropertyError(obj, key, `The property '${key}' on ${obj} was changed after being rendered. If you want to change a property used in a template after the component has rendered, mark the property as a tracked property with the @tracked decorator.`);
    }
}
function defaultErrorThrower(obj, key) {
    throw UntrackedPropertyError.for(obj, key);
}
function tagForProperty(obj, key, throwError = defaultErrorThrower) {
    if (typeof obj === "object" && obj) {
        if (true && !hasTag(obj, key)) {
            installDevModeErrorInterceptor(obj, key, throwError);
        }
        let meta = metaFor(obj);
        return meta.tagFor(key);
    } else {
        return CONSTANT_TAG;
    }
}
/**
 * In development mode only, we install an ad hoc setter on properties where a
 * tag is requested (i.e., it was used in a template) without being tracked. In
 * cases where the property is set, we raise an error.
 */
function installDevModeErrorInterceptor(obj, key, throwError) {
    let target = obj;
    let descriptor;
    // Find the descriptor for the current property. We may need to walk the
    // prototype chain to do so. If the property is undefined, we may never get a
    // descriptor here.
    let hasOwnDescriptor = true;
    while (target) {
        descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (descriptor) {
            break;
        }
        hasOwnDescriptor = false;
        target = Object.getPrototypeOf(target);
    }
    // If possible, define a property descriptor that passes through the current
    // value on reads but throws an exception on writes.
    if (descriptor) {
        if (descriptor.configurable || !hasOwnDescriptor) {
            Object.defineProperty(obj, key, {
                configurable: descriptor.configurable,
                enumerable: descriptor.enumerable,
                get() {
                    if (descriptor.get) {
                        return descriptor.get.call(this);
                    } else {
                        return descriptor.value;
                    }
                },
                set() {
                    throwError(this, key);
                }
            });
        }
    } else {
        Object.defineProperty(obj, key, {
            set() {
                throwError(this, key);
            }
        });
    }
}

/**
 * The `Component` class defines an encapsulated UI element that is rendered to
 * the DOM. A component is made up of a template and, optionally, this component
 * object.
 *
 * ## Defining a Component
 *
 * To define a component, subclass `Component` and add your own properties,
 * methods and lifecycle hooks:
 *
 * ```ts
 * import Component from '@glimmer/component';
 *
 * export default class extends Component {
 * }
 * ```
 *
 * ## Lifecycle Hooks
 *
 * Lifecycle hooks allow you to respond to changes to a component, such as when
 * it gets created, rendered, updated or destroyed. To add a lifecycle hook to a
 * component, implement the hook as a method on your component subclass.
 *
 * For example, to be notified when Glimmer has rendered your component so you
 * can attach a legacy jQuery plugin, implement the `didInsertElement()` method:
 *
 * ```ts
 * import Component from '@glimmer/component';
 *
 * export default class extends Component {
 *   didInsertElement() {
 *     $(this.element).pickadate();
 *   }
 * }
 * ```
 *
 * ## Data for Templates
 *
 * `Component`s have two different kinds of data, or state, that can be
 * displayed in templates:
 *
 * 1. Arguments
 * 2. Properties
 *
 * Arguments are data that is passed in to a component from its parent
 * component. For example, if I have a `UserGreeting` component, I can pass it
 * a name and greeting to use:
 *
 * ```hbs
 * <UserGreeting @name="Ricardo" @greeting="Olá" />
 * ```
 *
 * Inside my `UserGreeting` template, I can access the `@name` and `@greeting`
 * arguments that I've been given:
 *
 * ```hbs
 * {{@greeting}}, {{@name}}!
 * ```
 *
 * Arguments are also available inside my component:
 *
 * ```ts
 * console.log(this.args.greeting); // prints "Olá"
 * ```
 *
 * Properties, on the other hand, are internal to the component and declared in
 * the class. You can use properties to store data that you want to show in the
 * template, or pass to another component as an argument.
 *
 * ```ts
 * import Component from '@glimmer/component';
 *
 * export default class extends Component {
 *   user = {
 *     name: 'Robbie'
 *   }
 * }
 * ```
 *
 * In the above example, we've defined a component with a `user` property that
 * contains an object with its own `name` property.
 *
 * We can render that property in our template:
 *
 * ```hbs
 * Hello, {{user.name}}!
 * ```
 *
 * We can also take that property and pass it as an argument to the
 * `UserGreeting` component we defined above:
 *
 * ```hbs
 * <UserGreeting @greeting="Hello" @name={{user.name}} />
 * ```
 *
 * ## Arguments vs. Properties
 *
 * Remember, arguments are data that was given to your component by its parent
 * component, and properties are data your component has defined for itself.
 *
 * You can tell the difference between arguments and properties in templates
 * because arguments always start with an `@` sign (think "A is for arguments"):
 *
 * ```hbs
 * {{@firstName}}
 * ```
 *
 * We know that `@firstName` came from the parent component, not the current
 * component, because it starts with `@` and is therefore an argument.
 *
 * On the other hand, if we see:
 *
 * ```hbs
 * {{name}}
 * ```
 *
 * We know that `name` is a property on the component. If we want to know where
 * the data is coming from, we can go look at our component class to find out.
 *
 * Inside the component itself, arguments always show up inside the component's
 * `args` property. For example, if `{{@firstName}}` is `Tom` in the template,
 * inside the component `this.args.firstName` would also be `Tom`.
 */
class Component {
  /**
   * Constructs a new component and assigns itself the passed properties. You
   * should not construct new components yourself. Instead, Glimmer will
   * instantiate new components automatically as it renders.
   *
   * @param options
   */
  constructor(options) {
    /**
     * Development-mode only name of the component, useful for debugging.
     */
    this.debugName = null;
    /** @private
     * Slot on the component to save Arguments object passed to the `args` setter.
     */
    this.__args__ = null;
    Object.assign(this, options);
  }
  /**
   * The element corresponding to the main element of the component's template.
   * The main element is the element in the template that has `...attributes` set on it:
   *
   * ```hbs
   * <h1>Modal</h1>
   * <div class="contents" ...attributes>
   *   {{yield}}
   * </div>
   * ```
   *
   * In this example, `this.element` would be the `div` with the class `contents`.
   *
   * You should not try to access this property until after the component's `didInsertElement()`
   * lifecycle hook is called.
   */
  get element() {
    let bounds = this.bounds;

    debugAssert(bounds && bounds.firstNode === bounds.lastNode, `The 'element' property can only be accessed on components that contain a single root element in their template. Try using 'bounds' instead to access the first and last nodes.`);
    return bounds.firstNode;
  }
  /**
   * Named arguments passed to the component from its parent component.
   * They can be accessed in JavaScript via `this.args.argumentName` and in the template via `@argumentName`.
   *
   * Say you have the following component, which will have two `args`, `firstName` and `lastName`:
   *
   * ```hbs
   * <my-component @firstName="Arthur" @lastName="Dent" />
   * ```
   *
   * If you needed to calculate `fullName` by combining both of them, you would do:
   *
   * ```ts
   * didInsertElement() {
   *   console.log(`Hi, my full name is ${this.args.firstName} ${this.args.lastName}`);
   * }
   * ```
   *
   * While in the template you could do:
   *
   * ```hbs
   * <p>Welcome, {{@firstName}} {{@lastName}}!</p>
   * ```
   *
   */
  get args() {
    return this.__args__;
  }
  set args(args) {
    this.__args__ = args;
    metaFor(this).dirtyableTagFor("args").inner.dirty();
  }
  static create(injections) {
    return new this(injections);
  }
  /**
   * Called when the component has been inserted into the DOM.
   * Override this function to do any set up that requires an element in the document body.
   */
  didInsertElement() {}
  /**
   * Called when the component has updated and rerendered itself.
   * Called only during a rerender, not during an initial render.
   */
  didUpdate() {}
  /**
   * Called before the component has been removed from the DOM.
   */
  willDestroy() {}
  destroy() {
    this.willDestroy();
  }
  toString() {
    return `${this.debugName} component`;
  }
}

const CAPABILITIES = {
    dynamicLayout: false,
    dynamicTag: true,
    prepareArgs: false,
    createArgs: true,
    attributeHook: true,
    elementHook: true
};

class ComponentDefinition {
    constructor(name, manager, ComponentClass, handle) {
        this.name = name;
        this.manager = manager;
        this.ComponentClass = ComponentClass;
        this.handle = handle;
        this.state = {
            name,
            capabilities: CAPABILITIES,
            ComponentClass,
            handle
        };
    }
    toJSON() {
        return { GlimmerDebug: `<component-definition name="${this.name}">` };
    }
}

class Container {
    constructor(registry, resolver = null) {
        this._registry = registry;
        this._resolver = resolver;
        this._lookups = {};
        this._factoryDefinitionLookups = {};
    }
    factoryFor(specifier) {
        let factoryDefinition = this._factoryDefinitionLookups[specifier];
        if (!factoryDefinition) {
            if (this._resolver) {
                factoryDefinition = this._resolver.retrieve(specifier);
            }
            if (!factoryDefinition) {
                factoryDefinition = this._registry.registration(specifier);
            }
            if (factoryDefinition) {
                this._factoryDefinitionLookups[specifier] = factoryDefinition;
            }
        }
        if (!factoryDefinition) {
            return;
        }
        return this.buildFactory(specifier, factoryDefinition);
    }
    lookup(specifier) {
        let singleton = this._registry.registeredOption(specifier, 'singleton') !== false;
        if (singleton && this._lookups[specifier]) {
            return this._lookups[specifier];
        }
        let factory = this.factoryFor(specifier);
        if (!factory) {
            return;
        }
        if (this._registry.registeredOption(specifier, 'instantiate') === false) {
            return factory.class;
        }
        let object = factory.create();
        if (singleton && object) {
            this._lookups[specifier] = object;
        }
        return object;
    }
    defaultInjections(specifier) {
        return {};
    }
    buildInjections(specifier) {
        let hash = this.defaultInjections(specifier);
        let injections = this._registry.registeredInjections(specifier);
        let injection;
        for (let i = 0; i < injections.length; i++) {
            injection = injections[i];
            hash[injection.property] = this.lookup(injection.source);
        }
        return hash;
    }
    buildFactory(specifier, factoryDefinition) {
        let injections = this.buildInjections(specifier);
        return {
            class: factoryDefinition,
            create(options) {
                let mergedOptions = Object.assign({}, injections, options);
                return factoryDefinition.create(mergedOptions);
            }
        };
    }
}

class Registry {
    constructor(options) {
        this._registrations = {};
        this._registeredOptions = {};
        this._registeredInjections = {};
        if (options && options.fallback) {
            this._fallback = options.fallback;
        }
    }
    register(specifier, factoryDefinition, options) {
        this._registrations[specifier] = factoryDefinition;
        if (options) {
            this._registeredOptions[specifier] = options;
        }
    }
    registration(specifier) {
        let registration = this._registrations[specifier];
        if (registration === undefined && this._fallback) {
            registration = this._fallback.registration(specifier);
        }
        return registration;
    }
    unregister(specifier) {
        delete this._registrations[specifier];
        delete this._registeredOptions[specifier];
        delete this._registeredInjections[specifier];
    }
    registerOption(specifier, option, value) {
        let options = this._registeredOptions[specifier];
        if (!options) {
            options = {};
            this._registeredOptions[specifier] = options;
        }
        options[option] = value;
    }
    registeredOption(specifier, option) {
        let result;
        let options = this.registeredOptions(specifier);
        if (options) {
            result = options[option];
        }
        if (result === undefined && this._fallback !== undefined) {
            result = this._fallback.registeredOption(specifier, option);
        }
        return result;
    }
    registeredOptions(specifier) {
        let options = this._registeredOptions[specifier];
        if (options === undefined) {
            var _specifier$split = specifier.split(':');

            let type = _specifier$split[0];

            options = this._registeredOptions[type];
        }
        return options;
    }
    unregisterOption(specifier, option) {
        let options = this._registeredOptions[specifier];
        if (options) {
            delete options[option];
        }
    }
    registerInjection(specifier, property, source) {
        let injections = this._registeredInjections[specifier];
        if (injections === undefined) {
            this._registeredInjections[specifier] = injections = [];
        }
        injections.push({
            property,
            source
        });
    }
    registeredInjections(specifier) {
        var _specifier$split2 = specifier.split(':');

        let type = _specifier$split2[0];

        let injections = this._fallback ? this._fallback.registeredInjections(specifier) : [];
        Array.prototype.push.apply(injections, this._registeredInjections[type]);
        Array.prototype.push.apply(injections, this._registeredInjections[specifier]);
        return injections;
    }
}

// TODO - use symbol
const OWNER = '__owner__';
function getOwner(object) {
    return object[OWNER];
}
function setOwner(object, owner) {
    object[OWNER] = owner;
}

/**
 * Contains the first and last DOM nodes in a component's rendered
 * template. These nodes can be used to traverse the section of DOM
 * that belongs to a particular component.
 *
 * Note that these nodes *can* change over the lifetime of a component
 * if the beginning or ending of the template is dynamic.
 */
class Bounds {
    constructor(_bounds) {
        this._bounds = _bounds;
    }
    get firstNode() {
        return this._bounds.firstNode();
    }
    get lastNode() {
        return this._bounds.lastNode();
    }
}

class AppendOpcodes {
    constructor() {
        this.evaluateOpcode = fillNulls(82 /* Size */).slice();
    }
    add(name, evaluate, kind = 'syscall') {
        this.evaluateOpcode[name] = { syscall: kind === 'syscall', evaluate };
    }
    debugBefore(vm, opcode, type) {
        let sp;
        let state;
        return { sp: sp, state };
    }
    debugAfter(vm, opcode, type, pre) {
        let expectedChange;
        let sp = pre.sp,
            state = pre.state;

        let metadata = null;
        if (metadata !== null) {
            if (typeof metadata.stackChange === 'number') {
                expectedChange = metadata.stackChange;
            } else {
                expectedChange = metadata.stackChange({ opcode, constants: vm.constants, state });
                if (isNaN(expectedChange)) throw unreachable();
            }
        }
        let actualChange = vm.stack.sp - sp;
        if (metadata && metadata.check && typeof expectedChange === 'number' && expectedChange !== actualChange) {
            var _ref2 = [];
            let name = _ref2[0],
                params = _ref2[1];

            throw new Error(`Error in ${name}:\n\n${vm['pc'] + opcode.size}. ${''}\n\nStack changed by ${actualChange}, expected ${expectedChange}`);
        }
        
    }
    evaluate(vm, opcode, type) {
        let operation = this.evaluateOpcode[type];
        if (operation.syscall) {
            false && debugAssert(!opcode.isMachine, `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${opcode.isMachine}) for ${opcode.type}`);

            operation.evaluate(vm, opcode);
        } else {
            false && debugAssert(opcode.isMachine, `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${opcode.isMachine}) for ${opcode.type}`);

            operation.evaluate(vm.inner, opcode);
        }
    }
}
const APPEND_OPCODES = new AppendOpcodes();
class AbstractOpcode {
    constructor() {
        initializeGuid(this);
    }
}
class UpdatingOpcode extends AbstractOpcode {
    constructor() {
        super(...arguments);
        this.next = null;
        this.prev = null;
    }
}

/**
 * Registers
 *
 * For the most part, these follows MIPS naming conventions, however the
 * register numbers are different.
 */
var Register;
(function (Register) {
    // $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
    Register[Register["pc"] = 0] = "pc";
    // $1 or $ra (return address): pointer into `program` for the return
    Register[Register["ra"] = 1] = "ra";
    // $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack
    Register[Register["fp"] = 2] = "fp";
    // $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack
    Register[Register["sp"] = 3] = "sp";
    // $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers
    Register[Register["s0"] = 4] = "s0";
    Register[Register["s1"] = 5] = "s1";
    // $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers
    Register[Register["t0"] = 6] = "t0";
    Register[Register["t1"] = 7] = "t1";
    // $8 or $v0 (return value)
    Register[Register["v0"] = 8] = "v0";
})(Register || (Register = {}));

class PrimitiveReference extends ConstReference {
    constructor(value) {
        super(value);
    }
    static create(value) {
        if (value === undefined) {
            return UNDEFINED_REFERENCE;
        } else if (value === null) {
            return NULL_REFERENCE;
        } else if (value === true) {
            return TRUE_REFERENCE;
        } else if (value === false) {
            return FALSE_REFERENCE;
        } else if (typeof value === 'number') {
            return new ValueReference(value);
        } else {
            return new StringReference(value);
        }
    }
    get(_key) {
        return UNDEFINED_REFERENCE;
    }
}
class StringReference extends PrimitiveReference {
    constructor() {
        super(...arguments);
        this.lengthReference = null;
    }
    get(key) {
        if (key === 'length') {
            let lengthReference = this.lengthReference;

            if (lengthReference === null) {
                lengthReference = this.lengthReference = new ValueReference(this.inner.length);
            }
            return lengthReference;
        } else {
            return super.get(key);
        }
    }
}
class ValueReference extends PrimitiveReference {
    constructor(value) {
        super(value);
    }
}
const UNDEFINED_REFERENCE = new ValueReference(undefined);
const NULL_REFERENCE = new ValueReference(null);
const TRUE_REFERENCE = new ValueReference(true);
const FALSE_REFERENCE = new ValueReference(false);
class ConditionalReference$1 {
    constructor(inner) {
        this.inner = inner;
        this.tag = inner.tag;
    }
    value() {
        return this.toBool(this.inner.value());
    }
    toBool(value) {
        return !!value;
    }
}

class ConcatReference extends CachedReference {
    constructor(parts) {
        super();
        this.parts = parts;
        this.tag = combineTagged(parts);
    }
    compute() {
        let parts = new Array();
        for (let i = 0; i < this.parts.length; i++) {
            let value = this.parts[i].value();
            if (value !== null && value !== undefined) {
                parts[i] = castToString(value);
            }
        }
        if (parts.length > 0) {
            return parts.join('');
        }
        return null;
    }
}
function castToString(value) {
    if (typeof value.toString !== 'function') {
        return '';
    }
    return String(value);
}

function stackAssert(name, top) {
    return `Expected top of stack to be ${name}, was ${String(top)}`;
}

APPEND_OPCODES.add(1 /* Helper */, (vm, { op1: handle }) => {
    let stack = vm.stack;
    let helper = vm.constants.resolveHandle(handle);
    let args = stack.pop();
    let value = helper(vm, args);
    vm.loadValue(Register.v0, value);
});
APPEND_OPCODES.add(4 /* GetVariable */, (vm, { op1: symbol }) => {
    let expr = vm.referenceForSymbol(symbol);
    vm.stack.push(expr);
});
APPEND_OPCODES.add(2 /* SetVariable */, (vm, { op1: symbol }) => {
    let expr = vm.stack.pop();
    vm.scope().bindSymbol(symbol, expr);
});
APPEND_OPCODES.add(3 /* SetBlock */, (vm, { op1: symbol }) => {
    let handle = vm.stack.pop();
    let scope = vm.stack.pop(); // FIXME(mmun): shouldn't need to cast this
    let table = vm.stack.pop();
    let block = table ? [handle, scope, table] : null;
    vm.scope().bindBlock(symbol, block);
});
APPEND_OPCODES.add(80 /* ResolveMaybeLocal */, (vm, { op1: _name }) => {
    let name = vm.constants.getString(_name);
    let locals = vm.scope().getPartialMap();
    let ref = locals[name];
    if (ref === undefined) {
        ref = vm.getSelf().get(name);
    }
    vm.stack.push(ref);
});
APPEND_OPCODES.add(17 /* RootScope */, (vm, { op1: symbols, op2: bindCallerScope }) => {
    vm.pushRootScope(symbols, !!bindCallerScope);
});
APPEND_OPCODES.add(5 /* GetProperty */, (vm, { op1: _key }) => {
    let key = vm.constants.getString(_key);
    let expr = vm.stack.pop();
    vm.stack.push(expr.get(key));
});
APPEND_OPCODES.add(6 /* GetBlock */, (vm, { op1: _block }) => {
    let stack = vm.stack;

    let block = vm.scope().getBlock(_block);
    if (block) {
        stack.push(block[2]);
        stack.push(block[1]);
        stack.push(block[0]);
    } else {
        stack.push(null);
        stack.push(null);
        stack.push(null);
    }
});
APPEND_OPCODES.add(7 /* HasBlock */, (vm, { op1: _block }) => {
    let hasBlock = !!vm.scope().getBlock(_block);
    vm.stack.push(hasBlock ? TRUE_REFERENCE : FALSE_REFERENCE);
});
APPEND_OPCODES.add(8 /* HasBlockParams */, vm => {
    // FIXME(mmun): should only need to push the symbol table
    let block = vm.stack.pop();
    let scope = vm.stack.pop();

    let table = vm.stack.pop();
    false && debugAssert(table === null || table && typeof table === 'object' && Array.isArray(table.parameters), stackAssert('Option<BlockSymbolTable>', table));

    let hasBlockParams = table && table.parameters.length;
    vm.stack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
});
APPEND_OPCODES.add(9 /* Concat */, (vm, { op1: count }) => {
    let out = new Array(count);
    for (let i = count; i > 0; i--) {
        let offset = i - 1;
        out[offset] = vm.stack.pop();
    }
    vm.stack.push(new ConcatReference(out));
});

var Opcodes;
(function (Opcodes) {
    // Statements
    Opcodes[Opcodes["Text"] = 0] = "Text";
    Opcodes[Opcodes["Append"] = 1] = "Append";
    Opcodes[Opcodes["Comment"] = 2] = "Comment";
    Opcodes[Opcodes["Modifier"] = 3] = "Modifier";
    Opcodes[Opcodes["Block"] = 4] = "Block";
    Opcodes[Opcodes["Component"] = 5] = "Component";
    Opcodes[Opcodes["OpenElement"] = 6] = "OpenElement";
    Opcodes[Opcodes["OpenSplattedElement"] = 7] = "OpenSplattedElement";
    Opcodes[Opcodes["FlushElement"] = 8] = "FlushElement";
    Opcodes[Opcodes["CloseElement"] = 9] = "CloseElement";
    Opcodes[Opcodes["StaticAttr"] = 10] = "StaticAttr";
    Opcodes[Opcodes["DynamicAttr"] = 11] = "DynamicAttr";
    Opcodes[Opcodes["AttrSplat"] = 12] = "AttrSplat";
    Opcodes[Opcodes["Yield"] = 13] = "Yield";
    Opcodes[Opcodes["Partial"] = 14] = "Partial";
    Opcodes[Opcodes["DynamicArg"] = 15] = "DynamicArg";
    Opcodes[Opcodes["StaticArg"] = 16] = "StaticArg";
    Opcodes[Opcodes["TrustingAttr"] = 17] = "TrustingAttr";
    Opcodes[Opcodes["Debugger"] = 18] = "Debugger";
    Opcodes[Opcodes["ClientSideStatement"] = 19] = "ClientSideStatement";
    // Expressions
    Opcodes[Opcodes["Unknown"] = 20] = "Unknown";
    Opcodes[Opcodes["Get"] = 21] = "Get";
    Opcodes[Opcodes["MaybeLocal"] = 22] = "MaybeLocal";
    Opcodes[Opcodes["HasBlock"] = 23] = "HasBlock";
    Opcodes[Opcodes["HasBlockParams"] = 24] = "HasBlockParams";
    Opcodes[Opcodes["Undefined"] = 25] = "Undefined";
    Opcodes[Opcodes["Helper"] = 26] = "Helper";
    Opcodes[Opcodes["Concat"] = 27] = "Concat";
    Opcodes[Opcodes["ClientSideExpression"] = 28] = "ClientSideExpression";
})(Opcodes || (Opcodes = {}));

function is(variant) {
    return function (value) {
        return Array.isArray(value) && value[0] === variant;
    };
}
// Statements




// Expressions
const isGet = is(Opcodes.Get);
const isMaybeLocal = is(Opcodes.MaybeLocal);

var Ops$1;
(function (Ops) {
    Ops[Ops["OpenComponentElement"] = 0] = "OpenComponentElement";
    Ops[Ops["DidCreateElement"] = 1] = "DidCreateElement";
    Ops[Ops["SetComponentAttrs"] = 2] = "SetComponentAttrs";
    Ops[Ops["DidRenderLayout"] = 3] = "DidRenderLayout";
    Ops[Ops["Debugger"] = 4] = "Debugger";
})(Ops$1 || (Ops$1 = {}));

var Ops$$1 = Opcodes;
const ATTRS_BLOCK = '&attrs';
class Compilers {
    constructor(offset = 0) {
        this.offset = offset;
        this.names = dict();
        this.funcs = [];
    }
    add(name, func) {
        this.funcs.push(func);
        this.names[name] = this.funcs.length - 1;
    }
    compile(sexp, builder) {
        let name = sexp[this.offset];
        let index = this.names[name];
        let func = this.funcs[index];
        false && debugAssert(!!func, `expected an implementation for ${this.offset === 0 ? Ops$$1[sexp[0]] : Ops$1[sexp[1]]}`);

        func(sexp, builder);
    }
}
let _statementCompiler;
function statementCompiler() {
    if (_statementCompiler) {
        return _statementCompiler;
    }
    const STATEMENTS = _statementCompiler = new Compilers();
    STATEMENTS.add(Ops$$1.Text, (sexp, builder) => {
        builder.text(sexp[1]);
    });
    STATEMENTS.add(Ops$$1.Comment, (sexp, builder) => {
        builder.comment(sexp[1]);
    });
    STATEMENTS.add(Ops$$1.CloseElement, (_sexp, builder) => {
        builder.closeElement();
    });
    STATEMENTS.add(Ops$$1.FlushElement, (_sexp, builder) => {
        builder.flushElement();
    });
    STATEMENTS.add(Ops$$1.Modifier, (sexp, builder) => {
        let resolver = builder.resolver,
            referrer = builder.referrer;
        let name = sexp[1],
            params = sexp[2],
            hash = sexp[3];

        let handle = resolver.lookupModifier(name, referrer);
        if (handle) {
            builder.modifier(handle, params, hash);
        } else {
            throw new Error(`Compile Error ${name} is not a modifier: Helpers may not be used in the element form.`);
        }
    });
    STATEMENTS.add(Ops$$1.StaticAttr, (sexp, builder) => {
        let name = sexp[1],
            value = sexp[2],
            namespace = sexp[3];

        builder.staticAttr(name, namespace, value);
    });
    STATEMENTS.add(Ops$$1.DynamicAttr, (sexp, builder) => {
        dynamicAttr(sexp, false, builder);
    });
    STATEMENTS.add(Ops$$1.TrustingAttr, (sexp, builder) => {
        dynamicAttr(sexp, true, builder);
    });
    STATEMENTS.add(Ops$$1.OpenElement, (sexp, builder) => {
        builder.openPrimitiveElement(sexp[1]);
    });
    STATEMENTS.add(Ops$$1.OpenSplattedElement, (sexp, builder) => {
        builder.setComponentAttrs(true);
        builder.putComponentOperations();
        builder.openPrimitiveElement(sexp[1]);
    });
    STATEMENTS.add(Ops$$1.Component, (sexp, builder) => {
        let tag = sexp[1],
            _attrs = sexp[2],
            args = sexp[3],
            block = sexp[4];
        let resolver = builder.resolver,
            referrer = builder.referrer;

        let handle = resolver.lookupComponentDefinition(tag, referrer);
        if (handle !== null) {
            let capabilities = resolver.getCapabilities(handle);
            let attrs = [[Ops$$1.ClientSideStatement, Ops$1.SetComponentAttrs, true], ..._attrs, [Ops$$1.ClientSideStatement, Ops$1.SetComponentAttrs, false]];
            let attrsBlock = builder.inlineBlock({ statements: attrs, parameters: EMPTY_ARRAY });
            let child = builder.template(block);
            if (capabilities.dynamicLayout === false) {
                let layout = resolver.getLayout(handle);
                builder.pushComponentDefinition(handle);
                builder.invokeStaticComponent(capabilities, layout, attrsBlock, null, args, false, child && child);
            } else {
                builder.pushComponentDefinition(handle);
                builder.invokeComponent(attrsBlock, null, args, false, child && child);
            }
        } else {
            throw new Error(`Compile Error: Cannot find component ${tag}`);
        }
    });
    STATEMENTS.add(Ops$$1.Partial, (sexp, builder) => {
        let name = sexp[1],
            evalInfo = sexp[2];
        let referrer = builder.referrer;

        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        builder.expr(name);
        builder.dup();
        builder.enter(2);
        builder.jumpUnless('ELSE');
        builder.invokePartial(referrer, builder.evalSymbols(), evalInfo);
        builder.popScope();
        builder.popFrame();
        builder.label('ELSE');
        builder.exit();
        builder.return();
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    STATEMENTS.add(Ops$$1.Yield, (sexp, builder) => {
        let to = sexp[1],
            params = sexp[2];

        builder.yield(to, params);
    });
    STATEMENTS.add(Ops$$1.AttrSplat, (sexp, builder) => {
        let to = sexp[1];

        builder.yield(to, []);
        builder.didCreateElement(Register.s0);
        builder.setComponentAttrs(false);
    });
    STATEMENTS.add(Ops$$1.Debugger, (sexp, builder) => {
        let evalInfo = sexp[1];

        builder.debugger(builder.evalSymbols(), evalInfo);
    });
    STATEMENTS.add(Ops$$1.ClientSideStatement, (sexp, builder) => {
        CLIENT_SIDE.compile(sexp, builder);
    });
    STATEMENTS.add(Ops$$1.Append, (sexp, builder) => {
        let value = sexp[1],
            trusting = sexp[2];
        let inlines = builder.macros.inlines;

        let returned = inlines.compile(sexp, builder) || value;
        if (returned === true) return;
        let isGet$$1 = isGet(value);
        let isMaybeLocal$$1 = isMaybeLocal(value);
        if (trusting) {
            builder.guardedAppend(value, true);
        } else {
            if (isGet$$1 || isMaybeLocal$$1) {
                builder.guardedAppend(value, false);
            } else {
                builder.expr(value);
                builder.primitive(false);
                builder.load(Register.t0);
                builder.dynamicContent();
            }
        }
    });
    STATEMENTS.add(Ops$$1.Block, (sexp, builder) => {
        let name = sexp[1],
            params = sexp[2],
            hash = sexp[3],
            _template = sexp[4],
            _inverse = sexp[5];

        let template = builder.template(_template);
        let inverse = builder.template(_inverse);
        let templateBlock = template && template;
        let inverseBlock = inverse && inverse;
        let blocks = builder.macros.blocks;

        blocks.compile(name, params, hash, templateBlock, inverseBlock, builder);
    });
    const CLIENT_SIDE = new Compilers(1);
    CLIENT_SIDE.add(Ops$1.OpenComponentElement, (sexp, builder) => {
        builder.putComponentOperations();
        builder.openPrimitiveElement(sexp[2]);
    });
    CLIENT_SIDE.add(Ops$1.DidCreateElement, (_sexp, builder) => {
        builder.didCreateElement(Register.s0);
    });
    CLIENT_SIDE.add(Ops$1.SetComponentAttrs, (sexp, builder) => {
        builder.setComponentAttrs(sexp[2]);
    });
    CLIENT_SIDE.add(Ops$1.Debugger, () => {
        // tslint:disable-next-line:no-debugger
        debugger;
    });
    CLIENT_SIDE.add(Ops$1.DidRenderLayout, (_sexp, builder) => {
        builder.didRenderLayout(Register.s0);
    });
    return STATEMENTS;
}
function dynamicAttr(sexp, trusting, builder) {
    let name = sexp[1],
        value = sexp[2],
        namespace = sexp[3];

    builder.expr(value);
    if (namespace) {
        builder.dynamicAttr(name, namespace, trusting);
    } else {
        builder.dynamicAttr(name, null, trusting);
    }
}
let _expressionCompiler;
function expressionCompiler() {
    if (_expressionCompiler) {
        return _expressionCompiler;
    }
    const EXPRESSIONS = _expressionCompiler = new Compilers();
    EXPRESSIONS.add(Ops$$1.Unknown, (sexp, builder) => {
        let resolver = builder.resolver,
            asPartial = builder.asPartial,
            referrer = builder.referrer;

        let name = sexp[1];
        let handle = resolver.lookupHelper(name, referrer);
        if (handle !== null) {
            builder.helper(handle, null, null);
        } else if (asPartial) {
            builder.resolveMaybeLocal(name);
        } else {
            builder.getVariable(0);
            builder.getProperty(name);
        }
    });
    EXPRESSIONS.add(Ops$$1.Concat, (sexp, builder) => {
        let parts = sexp[1];
        for (let i = 0; i < parts.length; i++) {
            builder.expr(parts[i]);
        }
        builder.concat(parts.length);
    });
    EXPRESSIONS.add(Ops$$1.Helper, (sexp, builder) => {
        let resolver = builder.resolver,
            referrer = builder.referrer;
        let name = sexp[1],
            params = sexp[2],
            hash = sexp[3];
        // TODO: triage this in the WF compiler

        if (name === 'component') {
            false && debugAssert(params.length, 'SYNTAX ERROR: component helper requires at least one argument');

            let definition = params[0],
                restArgs = params.slice(1);

            builder.curryComponent(definition, restArgs, hash, true);
            return;
        }
        let handle = resolver.lookupHelper(name, referrer);
        if (handle !== null) {
            builder.helper(handle, params, hash);
        } else {
            throw new Error(`Compile Error: ${name} is not a helper`);
        }
    });
    EXPRESSIONS.add(Ops$$1.Get, (sexp, builder) => {
        let head = sexp[1],
            path = sexp[2];

        builder.getVariable(head);
        for (let i = 0; i < path.length; i++) {
            builder.getProperty(path[i]);
        }
    });
    EXPRESSIONS.add(Ops$$1.MaybeLocal, (sexp, builder) => {
        let path = sexp[1];

        if (builder.asPartial) {
            let head = path[0];
            path = path.slice(1);
            builder.resolveMaybeLocal(head);
        } else {
            builder.getVariable(0);
        }
        for (let i = 0; i < path.length; i++) {
            builder.getProperty(path[i]);
        }
    });
    EXPRESSIONS.add(Ops$$1.Undefined, (_sexp, builder) => {
        return builder.pushPrimitiveReference(undefined);
    });
    EXPRESSIONS.add(Ops$$1.HasBlock, (sexp, builder) => {
        builder.hasBlock(sexp[1]);
    });
    EXPRESSIONS.add(Ops$$1.HasBlockParams, (sexp, builder) => {
        builder.hasBlockParams(sexp[1]);
    });
    return EXPRESSIONS;
}
class Macros {
    constructor() {
        var _populateBuiltins = populateBuiltins();

        let blocks = _populateBuiltins.blocks,
            inlines = _populateBuiltins.inlines;

        this.blocks = blocks;
        this.inlines = inlines;
    }
}
class Blocks {
    constructor() {
        this.names = dict();
        this.funcs = [];
    }
    add(name, func) {
        this.funcs.push(func);
        this.names[name] = this.funcs.length - 1;
    }
    addMissing(func) {
        this.missing = func;
    }
    compile(name, params, hash, template, inverse, builder) {
        let index = this.names[name];
        if (index === undefined) {
            false && debugAssert(!!this.missing, `${name} not found, and no catch-all block handler was registered`);

            let func = this.missing;
            let handled = func(name, params, hash, template, inverse, builder);
            false && debugAssert(!!handled, `${name} not found, and the catch-all block handler didn't handle it`);
        } else {
            let func = this.funcs[index];
            func(params, hash, template, inverse, builder);
        }
    }
}
class Inlines {
    constructor() {
        this.names = dict();
        this.funcs = [];
    }
    add(name, func) {
        this.funcs.push(func);
        this.names[name] = this.funcs.length - 1;
    }
    addMissing(func) {
        this.missing = func;
    }
    compile(sexp, builder) {
        let value = sexp[1];
        // TODO: Fix this so that expression macros can return
        // things like components, so that {{component foo}}
        // is the same as {{(component foo)}}
        if (!Array.isArray(value)) return ['expr', value];
        let name;
        let params;
        let hash;
        if (value[0] === Ops$$1.Helper) {
            name = value[1];
            params = value[2];
            hash = value[3];
        } else if (value[0] === Ops$$1.Unknown) {
            name = value[1];
            params = hash = null;
        } else {
            return ['expr', value];
        }
        let index = this.names[name];
        if (index === undefined && this.missing) {
            let func = this.missing;
            let returned = func(name, params, hash, builder);
            return returned === false ? ['expr', value] : returned;
        } else if (index !== undefined) {
            let func = this.funcs[index];
            let returned = func(name, params, hash, builder);
            return returned === false ? ['expr', value] : returned;
        } else {
            return ['expr', value];
        }
    }
}
function populateBuiltins(blocks = new Blocks(), inlines = new Inlines()) {
    blocks.add('if', (params, _hash, template, inverse, builder) => {
        //        PutArgs
        //        Test(Environment)
        //        Enter(BEGIN, END)
        // BEGIN: Noop
        //        JumpUnless(ELSE)
        //        Evaluate(default)
        //        Jump(END)
        // ELSE:  Noop
        //        Evalulate(inverse)
        // END:   Noop
        //        Exit
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #if requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        builder.expr(params[0]);
        builder.toBoolean();
        builder.enter(1);
        builder.jumpUnless('ELSE');
        builder.invokeStaticBlock(template);
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStaticBlock(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('unless', (params, _hash, template, inverse, builder) => {
        //        PutArgs
        //        Test(Environment)
        //        Enter(BEGIN, END)
        // BEGIN: Noop
        //        JumpUnless(ELSE)
        //        Evaluate(default)
        //        Jump(END)
        // ELSE:  Noop
        //        Evalulate(inverse)
        // END:   Noop
        //        Exit
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #unless requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        builder.expr(params[0]);
        builder.toBoolean();
        builder.enter(1);
        builder.jumpIf('ELSE');
        builder.invokeStaticBlock(template);
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStaticBlock(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('with', (params, _hash, template, inverse, builder) => {
        //        PutArgs
        //        Test(Environment)
        //        Enter(BEGIN, END)
        // BEGIN: Noop
        //        JumpUnless(ELSE)
        //        Evaluate(default)
        //        Jump(END)
        // ELSE:  Noop
        //        Evalulate(inverse)
        // END:   Noop
        //        Exit
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #with requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        builder.expr(params[0]);
        builder.dup();
        builder.toBoolean();
        builder.enter(2);
        builder.jumpUnless('ELSE');
        builder.invokeStaticBlock(template, 1);
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStaticBlock(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('each', (params, hash, template, inverse, builder) => {
        //         Enter(BEGIN, END)
        // BEGIN:  Noop
        //         PutArgs
        //         PutIterable
        //         JumpUnless(ELSE)
        //         EnterList(BEGIN2, END2)
        // ITER:   Noop
        //         NextIter(BREAK)
        // BEGIN2: Noop
        //         PushChildScope
        //         Evaluate(default)
        //         PopScope
        // END2:   Noop
        //         Exit
        //         Jump(ITER)
        // BREAK:  Noop
        //         ExitList
        //         Jump(END)
        // ELSE:   Noop
        //         Evalulate(inverse)
        // END:    Noop
        //         Exit
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        if (hash && hash[0][0] === 'key') {
            builder.expr(hash[1][0]);
        } else {
            builder.pushPrimitiveReference(null);
        }
        builder.expr(params[0]);
        builder.enter(2);
        builder.putIterator();
        builder.jumpUnless('ELSE');
        builder.pushFrame();
        builder.returnTo('ITER');
        builder.dup(Register.fp, 1);
        builder.enterList('BODY');
        builder.label('ITER');
        builder.iterate('BREAK');
        builder.label('BODY');
        builder.invokeStaticBlock(template, 2);
        builder.pop(2);
        builder.exit();
        builder.return();
        builder.label('BREAK');
        builder.exitList();
        builder.popFrame();
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStaticBlock(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('in-element', (params, hash, template, _inverse, builder) => {
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #in-element requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        let keys = hash[0],
            values = hash[1];

        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (key === 'nextSibling' || key === 'guid') {
                builder.expr(values[i]);
            } else {
                throw new Error(`SYNTAX ERROR: #in-element does not take a \`${keys[0]}\` option`);
            }
        }
        builder.expr(params[0]);
        builder.dup();
        builder.enter(4);
        builder.jumpUnless('ELSE');
        builder.pushRemoteElement();
        builder.invokeStaticBlock(template);
        builder.popRemoteElement();
        builder.label('ELSE');
        builder.exit();
        builder.return();
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('-with-dynamic-vars', (_params, hash, template, _inverse, builder) => {
        if (hash) {
            let names = hash[0],
                expressions = hash[1];

            builder.compileParams(expressions);
            builder.pushDynamicScope();
            builder.bindDynamicScope(names);
            builder.invokeStaticBlock(template);
            builder.popDynamicScope();
        } else {
            builder.invokeStaticBlock(template);
        }
    });
    blocks.add('component', (_params, hash, template, inverse, builder) => {
        false && debugAssert(_params && _params.length, 'SYNTAX ERROR: #component requires at least one argument');

        let tag = _params[0];
        if (typeof tag === 'string') {
            let returned = builder.staticComponentHelper(_params[0], hash, template);
            if (returned) return;
        }

        let definition = _params[0],
            params = _params.slice(1);

        builder.dynamicComponent(definition, params, hash, true, template, inverse);
    });
    inlines.add('component', (_name, _params, hash, builder) => {
        false && debugAssert(_params && _params.length, 'SYNTAX ERROR: component helper requires at least one argument');

        let tag = _params && _params[0];
        if (typeof tag === 'string') {
            let returned = builder.staticComponentHelper(tag, hash, null);
            if (returned) return true;
        }

        let definition = _params[0],
            params = _params.slice(1);

        builder.dynamicComponent(definition, params, hash, true, null, null);
        return true;
    });
    return { blocks, inlines };
}

const PLACEHOLDER_HANDLE$1 = -1;
class CompilableTemplate {
    constructor(statements, containingLayout, options, symbolTable) {
        this.statements = statements;
        this.containingLayout = containingLayout;
        this.options = options;
        this.symbolTable = symbolTable;
        this.compiled = null;
        this.statementCompiler = statementCompiler();
    }
    static topLevel(block, options) {
        return new CompilableTemplate(block.statements, { block, referrer: options.referrer }, options, { referrer: options.referrer, hasEval: block.hasEval, symbols: block.symbols });
    }
    compile(stdLib) {
        let compiled = this.compiled;

        if (compiled !== null) return compiled;
        // Track that compilation has started but not yet finished by temporarily
        // using a placeholder handle. In eager compilation mode, where compile()
        // may be called recursively, we use this as a signal that the handle cannot
        // be known synchronously and must be linked lazily.
        this.compiled = PLACEHOLDER_HANDLE$1;
        let options = this.options,
            statements = this.statements,
            containingLayout = this.containingLayout;
        let referrer = containingLayout.referrer;
        let program = options.program,
            resolver = options.resolver,
            macros = options.macros,
            asPartial = options.asPartial,
            Builder = options.Builder;

        let builder = new Builder(program, resolver, referrer, macros, containingLayout, asPartial, stdLib);
        for (let i = 0; i < statements.length; i++) {
            this.statementCompiler.compile(statements[i], builder);
        }
        let handle = builder.commit(program.heap, containingLayout.block.symbols.length);
        return this.compiled = handle;
    }
}

class ComponentBuilder {
    constructor(builder) {
        this.builder = builder;
    }
    static(handle, args) {
        let params = args[0],
            hash = args[1],
            _default = args[2],
            inverse = args[3];
        let builder = this.builder;
        let resolver = builder.resolver;

        if (handle !== null) {
            let capabilities = resolver.getCapabilities(handle);
            if (capabilities.dynamicLayout === false) {
                let layout = resolver.getLayout(handle);
                builder.pushComponentDefinition(handle);
                builder.invokeStaticComponent(capabilities, layout, null, params, hash, false, _default, inverse);
            } else {
                builder.pushComponentDefinition(handle);
                builder.invokeComponent(null, params, hash, false, _default, inverse);
            }
        }
    }
}

class InstructionEncoder {
    constructor(buffer) {
        this.buffer = buffer;
        this.typePos = 0;
        this.size = 0;
    }
    encode(type, machine) {
        if (type > 255 /* TYPE_SIZE */) {
                throw new Error(`Opcode type over 8-bits. Got ${type}.`);
            }
        this.buffer.push(type | machine | arguments.length - 2 << 8 /* ARG_SHIFT */);
        this.typePos = this.buffer.length - 1;
        for (let i = 2; i < arguments.length; i++) {
            let op = arguments[i];
            if (typeof op === 'number' && op > 65535 /* MAX_SIZE */) {
                    throw new Error(`Operand over 16-bits. Got ${op}.`);
                }
            this.buffer.push(op);
        }
        
        this.size = this.buffer.length;
    }
    patch(position, operand) {
        if (this.buffer[position + 1] === -1) {
            this.buffer[position + 1] = operand;
        } else {
            throw new Error('Trying to patch operand in populated slot instead of a reserved slot.');
        }
    }
}

class Labels {
    constructor() {
        this.labels = dict();
        this.targets = [];
    }
    label(name, index) {
        this.labels[name] = index;
    }
    target(at, target) {
        this.targets.push({ at, target });
    }
    patch(encoder) {
        let targets = this.targets,
            labels = this.labels;

        for (let i = 0; i < targets.length; i++) {
            var _targets$i = targets[i];
            let at = _targets$i.at,
                target = _targets$i.target;

            let address = labels[target] - at;
            encoder.patch(at, address);
        }
    }
}
class SimpleOpcodeBuilder {
    constructor() {
        this.encoder = new InstructionEncoder([]);
    }
    push(name) {
        switch (arguments.length) {
            case 1:
                return this.encoder.encode(name, 0);
            case 2:
                return this.encoder.encode(name, 0, arguments[1]);
            case 3:
                return this.encoder.encode(name, 0, arguments[1], arguments[2]);
            default:
                return this.encoder.encode(name, 0, arguments[1], arguments[2], arguments[3]);
        }
    }
    pushMachine(name) {
        switch (arguments.length) {
            case 1:
                return this.encoder.encode(name, 1024 /* MACHINE_MASK */);
            case 2:
                return this.encoder.encode(name, 1024 /* MACHINE_MASK */, arguments[1]);
            case 3:
                return this.encoder.encode(name, 1024 /* MACHINE_MASK */, arguments[1], arguments[2]);
            default:
                return this.encoder.encode(name, 1024 /* MACHINE_MASK */, arguments[1], arguments[2], arguments[3]);
        }
    }
    commit(heap, scopeSize) {
        this.pushMachine(20 /* Return */);
        let buffer = this.encoder.buffer;
        // TODO: change the whole malloc API and do something more efficient

        let handle = heap.malloc();
        for (let i = 0; i < buffer.length; i++) {
            let value = buffer[i];
            typeof value === 'function' ? heap.pushPlaceholder(value) : heap.push(value);
        }
        heap.finishMalloc(handle, scopeSize);
        return handle;
    }
    reserve(name) {
        this.encoder.encode(name, 0, -1);
    }
    reserveMachine(name) {
        this.encoder.encode(name, 1024 /* MACHINE_MASK */, -1);
    }
    ///
    main() {
        this.push(56 /* Main */, Register.s0);
        this.invokePreparedComponent(false);
    }
    dynamicContent() {
        this.push(24 /* DynamicContent */);
    }
    beginComponentTransaction() {
        this.push(75 /* BeginComponentTransaction */);
    }
    commitComponentTransaction() {
        this.push(76 /* CommitComponentTransaction */);
    }
    pushDynamicScope() {
        this.push(36 /* PushDynamicScope */);
    }
    popDynamicScope() {
        this.push(37 /* PopDynamicScope */);
    }
    pushRemoteElement() {
        this.push(33 /* PushRemoteElement */);
    }
    popRemoteElement() {
        this.push(34 /* PopRemoteElement */);
    }
    pushRootScope(symbols, bindCallerScope) {
        this.push(17 /* RootScope */, symbols, bindCallerScope ? 1 : 0);
    }
    pushChildScope() {
        this.push(18 /* ChildScope */);
    }
    popScope() {
        this.push(19 /* PopScope */);
    }
    prepareArgs(state) {
        this.push(65 /* PrepareArgs */, state);
    }
    createComponent(state, hasDefault) {
        let flag = hasDefault | 0;
        this.push(67 /* CreateComponent */, flag, state);
    }
    registerComponentDestructor(state) {
        this.push(68 /* RegisterComponentDestructor */, state);
    }
    putComponentOperations() {
        this.push(69 /* PutComponentOperations */);
    }
    getComponentSelf(state) {
        this.push(70 /* GetComponentSelf */, state);
    }
    getComponentTagName(state) {
        this.push(71 /* GetComponentTagName */, state);
    }
    getComponentLayout(state) {
        this.push(72 /* GetComponentLayout */, state);
    }
    invokeComponentLayout(state) {
        this.push(74 /* InvokeComponentLayout */, state);
    }
    didCreateElement(state) {
        this.push(77 /* DidCreateElement */, state);
    }
    didRenderLayout(state) {
        this.push(78 /* DidRenderLayout */, state);
    }
    pushFrame() {
        this.pushMachine(47 /* PushFrame */);
    }
    popFrame() {
        this.pushMachine(48 /* PopFrame */);
    }
    invokeVirtual() {
        this.pushMachine(41 /* InvokeVirtual */);
    }
    invokeYield() {
        this.push(43 /* InvokeYield */);
    }
    toBoolean() {
        this.push(51 /* ToBoolean */);
    }
    invokePreparedComponent(hasBlock, populateLayout = null) {
        this.beginComponentTransaction();
        this.pushDynamicScope();
        this.createComponent(Register.s0, hasBlock);
        // this has to run after createComponent to allow
        // for late-bound layouts, but a caller is free
        // to populate the layout earlier if it wants to
        // and do nothing here.
        if (populateLayout) populateLayout();
        this.registerComponentDestructor(Register.s0);
        this.getComponentSelf(Register.s0);
        this.invokeComponentLayout(Register.s0);
        this.didRenderLayout(Register.s0);
        this.popFrame();
        this.popScope();
        this.popDynamicScope();
        this.commitComponentTransaction();
    }
    get pos() {
        return this.encoder.typePos;
    }
    get nextPos() {
        return this.encoder.size;
    }
}
class OpcodeBuilder extends SimpleOpcodeBuilder {
    constructor(program, resolver, referrer, macros, containingLayout, asPartial, stdLib) {
        super();
        this.program = program;
        this.resolver = resolver;
        this.referrer = referrer;
        this.macros = macros;
        this.containingLayout = containingLayout;
        this.asPartial = asPartial;
        this.stdLib = stdLib;
        this.component = new ComponentBuilder(this);
        this.expressionCompiler = expressionCompiler();
        this.labelsStack = new Stack();
        this.isComponentAttrs = false;
        this.constants = program.constants;
    }
    label(name) {
        this.labels.label(name, this.nextPos);
    }
    setComponentAttrs(enabled) {
        this.isComponentAttrs = enabled;
    }
    expr(expression) {
        if (Array.isArray(expression)) {
            this.expressionCompiler.compile(expression, this);
        } else {
            this.pushPrimitiveReference(expression);
        }
    }
    // args
    pushArgs(names, flags) {
        let serialized = this.constants.stringArray(names);
        this.push(63 /* PushArgs */, serialized, flags);
    }
    // helpers
    get labels() {
        return this.labelsStack.current;
    }
    startLabels() {
        this.labelsStack.push(new Labels());
    }
    stopLabels() {
        let label = this.labelsStack.pop();
        label.patch(this.encoder);
    }
    // components
    pushComponentDefinition(handle) {
        this.push(59 /* PushComponentDefinition */, this.constants.handle(handle));
    }
    pushCurriedComponent() {
        this.push(61 /* PushCurriedComponent */);
    }
    pushDynamicComponentInstance() {
        this.push(60 /* PushDynamicComponentInstance */);
    }
    resolveDynamicComponent(referrer) {
        this.push(62 /* ResolveDynamicComponent */, this.constants.serializable(referrer));
    }
    staticComponentHelper(tag, hash, template) {
        let handle = this.resolver.lookupComponentDefinition(tag, this.referrer);
        if (handle) {
            let capabilities = this.resolver.getCapabilities(handle);
            if (capabilities.dynamicLayout === false) {
                if (hash) {
                    for (let i = 0; i < hash.length; i = i + 2) {
                        hash[i][0] = `@${hash[i][0]}`;
                    }
                }
                let layout = this.resolver.getLayout(handle);
                this.pushComponentDefinition(handle);
                this.invokeStaticComponent(capabilities, layout, null, null, hash, false, template && template);
                return true;
            }
        }
        return false;
    }
    // partial
    invokePartial(referrer, symbols, evalInfo) {
        let _meta = this.constants.serializable(referrer);
        let _symbols = this.constants.stringArray(symbols);
        let _evalInfo = this.constants.array(evalInfo);
        this.push(79 /* InvokePartial */, _meta, _symbols, _evalInfo);
    }
    resolveMaybeLocal(name) {
        this.push(80 /* ResolveMaybeLocal */, this.string(name));
    }
    // debugger
    debugger(symbols, evalInfo) {
        this.push(81 /* Debugger */, this.constants.stringArray(symbols), this.constants.array(evalInfo));
    }
    // dom
    text(text) {
        this.push(22 /* Text */, this.constants.string(text));
    }
    openPrimitiveElement(tag) {
        this.push(25 /* OpenElement */, this.constants.string(tag));
    }
    openDynamicElement() {
        this.push(26 /* OpenDynamicElement */);
    }
    flushElement() {
        this.push(30 /* FlushElement */);
    }
    closeElement() {
        this.push(31 /* CloseElement */);
    }
    staticAttr(_name, _namespace, _value) {
        let name = this.constants.string(_name);
        let namespace = _namespace ? this.constants.string(_namespace) : 0;
        if (this.isComponentAttrs) {
            this.pushPrimitiveReference(_value);
            this.push(29 /* ComponentAttr */, name, 1, namespace);
        } else {
            let value = this.constants.string(_value);
            this.push(27 /* StaticAttr */, name, value, namespace);
        }
    }
    dynamicAttr(_name, _namespace, trusting) {
        let name = this.constants.string(_name);
        let namespace = _namespace ? this.constants.string(_namespace) : 0;
        if (this.isComponentAttrs) {
            this.push(29 /* ComponentAttr */, name, trusting === true ? 1 : 0, namespace);
        } else {
            this.push(28 /* DynamicAttr */, name, trusting === true ? 1 : 0, namespace);
        }
    }
    comment(_comment) {
        let comment = this.constants.string(_comment);
        this.push(23 /* Comment */, comment);
    }
    modifier(locator, params, hash) {
        this.pushFrame();
        this.compileArgs(params, hash, null, true);
        this.push(32 /* Modifier */, this.constants.handle(locator));
        this.popFrame();
    }
    // lists
    putIterator() {
        this.push(54 /* PutIterator */);
    }
    enterList(start) {
        this.reserve(52 /* EnterList */);
        this.labels.target(this.pos, start);
    }
    exitList() {
        this.push(53 /* ExitList */);
    }
    iterate(breaks) {
        this.reserve(55 /* Iterate */);
        this.labels.target(this.pos, breaks);
    }
    // expressions
    setVariable(symbol) {
        this.push(2 /* SetVariable */, symbol);
    }
    setBlock(symbol) {
        this.push(3 /* SetBlock */, symbol);
    }
    getVariable(symbol) {
        this.push(4 /* GetVariable */, symbol);
    }
    getProperty(key) {
        this.push(5 /* GetProperty */, this.string(key));
    }
    getBlock(symbol) {
        this.push(6 /* GetBlock */, symbol);
    }
    hasBlock(symbol) {
        this.push(7 /* HasBlock */, symbol);
    }
    hasBlockParams(to) {
        this.getBlock(to);
        this.resolveBlock();
        this.push(8 /* HasBlockParams */);
    }
    concat(size) {
        this.push(9 /* Concat */, size);
    }
    load(register) {
        this.push(15 /* Load */, register);
    }
    fetch(register) {
        this.push(16 /* Fetch */, register);
    }
    dup(register = Register.sp, offset = 0) {
        return this.push(13 /* Dup */, register, offset);
    }
    pop(count = 1) {
        return this.push(14 /* Pop */, count);
    }
    // vm
    returnTo(label) {
        this.reserveMachine(21 /* ReturnTo */);
        this.labels.target(this.pos, label);
    }
    primitive(_primitive) {
        let type = 0;
        let primitive;
        switch (typeof _primitive) {
            case 'number':
                if (_primitive % 1 === 0) {
                    if (_primitive > -1) {
                        primitive = _primitive;
                    } else {
                        primitive = this.negative(_primitive);
                        type = 4 /* NEGATIVE */;
                    }
                } else {
                    primitive = this.float(_primitive);
                    type = 1 /* FLOAT */;
                }
                break;
            case 'string':
                primitive = this.string(_primitive);
                type = 2 /* STRING */;
                break;
            case 'boolean':
                primitive = _primitive | 0;
                type = 3 /* BOOLEAN_OR_VOID */;
                break;
            case 'object':
                // assume null
                primitive = 2;
                type = 3 /* BOOLEAN_OR_VOID */;
                break;
            case 'undefined':
                primitive = 3;
                type = 3 /* BOOLEAN_OR_VOID */;
                break;
            default:
                throw new Error('Invalid primitive passed to pushPrimitive');
        }
        this.push(11 /* Primitive */, primitive << 3 | type);
    }
    float(num) {
        return this.constants.float(num);
    }
    negative(num) {
        return this.constants.negative(num);
    }
    pushPrimitiveReference(primitive) {
        this.primitive(primitive);
        this.primitiveReference();
    }
    primitiveReference() {
        this.push(12 /* PrimitiveReference */);
    }
    helper(helper, params, hash) {
        this.pushFrame();
        this.compileArgs(params, hash, null, true);
        this.push(1 /* Helper */, this.constants.handle(helper));
        this.popFrame();
        this.fetch(Register.v0);
    }
    bindDynamicScope(_names) {
        this.push(35 /* BindDynamicScope */, this.names(_names));
    }
    enter(args) {
        this.push(49 /* Enter */, args);
    }
    exit() {
        this.push(50 /* Exit */);
    }
    return() {
        this.pushMachine(20 /* Return */);
    }
    jump(target) {
        this.reserveMachine(44 /* Jump */);
        this.labels.target(this.pos, target);
    }
    jumpIf(target) {
        this.reserve(45 /* JumpIf */);
        this.labels.target(this.pos, target);
    }
    jumpUnless(target) {
        this.reserve(46 /* JumpUnless */);
        this.labels.target(this.pos, target);
    }
    // internal helpers
    string(_string) {
        return this.constants.string(_string);
    }
    names(_names) {
        let names = [];
        for (let i = 0; i < _names.length; i++) {
            let n = _names[i];
            names[i] = this.constants.string(n);
        }
        return this.constants.array(names);
    }
    symbols(symbols) {
        return this.constants.array(symbols);
    }
    // convenience methods
    inlineBlock(block) {
        let parameters = block.parameters,
            statements = block.statements;

        let symbolTable = { parameters, referrer: this.containingLayout.referrer };
        let options = {
            program: this.program,
            macros: this.macros,
            Builder: this.constructor,
            resolver: this.resolver,
            asPartial: this.asPartial,
            referrer: this.referrer
        };
        return new CompilableTemplate(statements, this.containingLayout, options, symbolTable);
    }
    evalSymbols() {
        let block = this.containingLayout.block;

        return block.hasEval ? block.symbols : null;
    }
    compileParams(params) {
        if (!params) return 0;
        for (let i = 0; i < params.length; i++) {
            this.expr(params[i]);
        }
        return params.length;
    }
    compileArgs(params, hash, blocks, synthetic) {
        if (blocks) {
            this.pushYieldableBlock(blocks.main);
            this.pushYieldableBlock(blocks.else);
            this.pushYieldableBlock(blocks.attrs);
        }
        let count = this.compileParams(params);
        let flags = count << 4;
        if (synthetic) flags |= 0b1000;
        if (blocks) {
            flags |= 0b111;
        }
        let names = EMPTY_ARRAY;
        if (hash) {
            names = hash[0];
            let val = hash[1];
            for (let i = 0; i < val.length; i++) {
                this.expr(val[i]);
            }
        }
        this.pushArgs(names, flags);
    }
    invokeStaticBlock(block, callerCount = 0) {
        let parameters = block.symbolTable.parameters;

        let calleeCount = parameters.length;
        let count = Math.min(callerCount, calleeCount);
        this.pushFrame();
        if (count) {
            this.pushChildScope();
            for (let i = 0; i < count; i++) {
                this.dup(Register.fp, callerCount - i);
                this.setVariable(parameters[i]);
            }
        }
        this.pushBlock(block);
        this.resolveBlock();
        this.invokeVirtual();
        if (count) {
            this.popScope();
        }
        this.popFrame();
    }
    builtInGuardedAppend() {
        this.dup();
        this.startLabels();
        this.isComponent();
        this.enter(2);
        this.jumpUnless('ELSE');
        this.pushCurriedComponent();
        this.pushDynamicComponentInstance();
        this.invokeComponent(null, null, null, false, null, null);
        this.exit();
        this.return();
        this.label('ELSE');
        this.dynamicContent();
        this.exit();
        this.return();
        this.stopLabels();
    }
    guardedAppend(expression, trusting) {
        this.startLabels();
        this.pushFrame();
        this.returnTo('END');
        if (this.stdLib) {
            this.primitive(!!trusting);
            this.load(Register.t0);
            this.expr(expression);
            this.primitive(this.stdLib.guardedAppend);
            this.invokeVirtual();
        } else {
            this.expr(expression);
            this.dup();
            this.isComponent();
            this.enter(2);
            this.jumpUnless('ELSE');
            this.pushCurriedComponent();
            this.pushDynamicComponentInstance();
            this.invokeComponent(null, null, null, false, null, null);
            this.exit();
            this.return();
            this.label('ELSE');
            this.primitive(!!trusting);
            this.load(Register.t0);
            this.dynamicContent();
            this.exit();
            this.return();
        }
        this.label('END');
        this.popFrame();
        this.stopLabels();
    }
    yield(to, params) {
        this.compileArgs(params, null, null, false);
        this.getBlock(to);
        this.resolveBlock();
        this.invokeYield();
        this.popScope();
        this.popFrame();
    }
    populateLayout(state) {
        this.push(73 /* PopulateLayout */, state);
    }
    invokeComponent(attrs, params, hash, synthetic, block, inverse = null, layout) {
        this.fetch(Register.s0);
        this.dup(Register.sp, 1);
        this.load(Register.s0);
        this.pushFrame();
        let blocks = { main: block, else: inverse, attrs };
        this.compileArgs(params, hash, blocks, synthetic);
        this.prepareArgs(Register.s0);
        this.invokePreparedComponent(block !== null, () => {
            if (layout) {
                this.pushSymbolTable(layout.symbolTable);
                this.pushLayout(layout);
                this.resolveLayout();
            } else {
                this.getComponentLayout(Register.s0);
            }
            this.populateLayout(Register.s0);
        });
        this.load(Register.s0);
    }
    invokeStaticComponent(capabilities, layout, attrs, params, hash, synthetic, block, inverse = null) {
        let symbolTable = layout.symbolTable;

        let bailOut = symbolTable.hasEval || capabilities.prepareArgs;
        if (bailOut) {
            this.invokeComponent(attrs, params, hash, synthetic, block, inverse, layout);
            return;
        }
        this.fetch(Register.s0);
        this.dup(Register.sp, 1);
        this.load(Register.s0);
        let symbols = symbolTable.symbols;

        if (capabilities.createArgs) {
            this.pushFrame();
            this.compileArgs(null, hash, null, synthetic);
        }
        this.beginComponentTransaction();
        this.pushDynamicScope();
        this.createComponent(Register.s0, block !== null);
        if (capabilities.createArgs) {
            this.popFrame();
        }
        this.registerComponentDestructor(Register.s0);
        let bindings = [];
        this.getComponentSelf(Register.s0);
        bindings.push({ symbol: 0, isBlock: false });
        for (let i = 0; i < symbols.length; i++) {
            let symbol = symbols[i];
            switch (symbol.charAt(0)) {
                case '&':
                    let callerBlock = null;
                    if (symbol === '&default') {
                        callerBlock = block;
                    } else if (symbol === '&inverse') {
                        callerBlock = inverse;
                    } else if (symbol === ATTRS_BLOCK) {
                        callerBlock = attrs;
                    } else {
                        throw unreachable();
                    }
                    if (callerBlock) {
                        this.pushYieldableBlock(callerBlock);
                        bindings.push({ symbol: i + 1, isBlock: true });
                    } else {
                        this.pushYieldableBlock(null);
                        bindings.push({ symbol: i + 1, isBlock: true });
                    }
                    break;
                case '@':
                    if (!hash) {
                        break;
                    }
                    let keys = hash[0],
                        values = hash[1];

                    let lookupName = symbol;
                    if (synthetic) {
                        lookupName = symbol.slice(1);
                    }
                    let index = keys.indexOf(lookupName);
                    if (index !== -1) {
                        this.expr(values[index]);
                        bindings.push({ symbol: i + 1, isBlock: false });
                    }
                    break;
            }
        }
        this.pushRootScope(symbols.length + 1, !!(block || inverse || attrs));
        for (let i = bindings.length - 1; i >= 0; i--) {
            var _bindings$i = bindings[i];
            let symbol = _bindings$i.symbol,
                isBlock = _bindings$i.isBlock;

            if (isBlock) {
                this.setBlock(symbol);
            } else {
                this.setVariable(symbol);
            }
        }
        this.pushFrame();
        this.invokeStatic(layout);
        this.didRenderLayout(Register.s0);
        this.popFrame();
        this.popScope();
        this.popDynamicScope();
        this.commitComponentTransaction();
        this.load(Register.s0);
    }
    dynamicComponent(definition, /* TODO: attrs: Option<RawInlineBlock>, */params, hash, synthetic, block, inverse = null) {
        this.startLabels();
        this.pushFrame();
        this.returnTo('END');
        this.expr(definition);
        this.dup();
        this.enter(2);
        this.jumpUnless('ELSE');
        this.resolveDynamicComponent(this.referrer);
        this.pushDynamicComponentInstance();
        this.invokeComponent(null, params, hash, synthetic, block, inverse);
        this.label('ELSE');
        this.exit();
        this.return();
        this.label('END');
        this.popFrame();
        this.stopLabels();
    }
    isComponent() {
        this.push(57 /* IsComponent */);
    }
    curryComponent(definition, /* TODO: attrs: Option<RawInlineBlock>, */params, hash, synthetic) {
        let referrer = this.referrer;
        this.pushFrame();
        this.compileArgs(params, hash, null, synthetic);
        this.push(66 /* CaptureArgs */);
        this.expr(definition);
        this.push(58 /* CurryComponent */, this.constants.serializable(referrer));
        this.popFrame();
        this.fetch(Register.v0);
    }
    pushSymbolTable(table) {
        if (table) {
            let constant = this.constants.serializable(table);
            this.push(40 /* PushSymbolTable */, constant);
        } else {
            this.primitive(null);
        }
    }
    pushBlockScope() {
        this.push(39 /* PushBlockScope */);
    }
    pushYieldableBlock(block) {
        this.pushSymbolTable(block && block.symbolTable);
        this.pushBlockScope();
        this.pushBlock(block);
    }
    template(block) {
        if (!block) return null;
        return this.inlineBlock(block);
    }
}
class LazyOpcodeBuilder extends OpcodeBuilder {
    pushBlock(block) {
        if (block) {
            this.pushOther(block);
        } else {
            this.primitive(null);
        }
    }
    resolveBlock() {
        this.push(38 /* CompileBlock */);
    }
    pushLayout(layout) {
        if (layout) {
            this.pushOther(layout);
        } else {
            this.primitive(null);
        }
    }
    resolveLayout() {
        this.push(38 /* CompileBlock */);
    }
    invokeStatic(compilable) {
        this.pushOther(compilable);
        this.push(38 /* CompileBlock */);
        this.pushMachine(41 /* InvokeVirtual */);
    }
    pushOther(value) {
        this.push(10 /* Constant */, this.other(value));
    }
    other(value) {
        return this.constants.other(value);
    }
}

class Arguments {
    constructor() {
        this.stack = null;
        this.positional = new PositionalArguments();
        this.named = new NamedArguments();
        this.blocks = new BlockArguments();
    }
    setup(stack, names, blockNames, positionalCount, synthetic) {
        this.stack = stack;
        /*
               | ... | blocks      | positional  | named |
               | ... | b0    b1    | p0 p1 p2 p3 | n0 n1 |
         index | ... | 4/5/6 7/8/9 | 10 11 12 13 | 14 15 |
                       ^             ^             ^  ^
                     bbase         pbase       nbase  sp
        */
        let named = this.named;
        let namedCount = names.length;
        let namedBase = stack.sp - namedCount + 1;
        named.setup(stack, namedBase, namedCount, names, synthetic);
        let positional = this.positional;
        let positionalBase = namedBase - positionalCount;
        positional.setup(stack, positionalBase, positionalCount);
        let blocks = this.blocks;
        let blocksCount = blockNames.length;
        let blocksBase = positionalBase - blocksCount * 3;
        blocks.setup(stack, blocksBase, blocksCount, blockNames);
    }
    get tag() {
        return combineTagged([this.positional, this.named]);
    }
    get base() {
        return this.blocks.base;
    }
    get length() {
        return this.positional.length + this.named.length + this.blocks.length * 3;
    }
    at(pos) {
        return this.positional.at(pos);
    }
    realloc(offset) {
        if (offset > 0) {
            let positional = this.positional,
                named = this.named,
                stack = this.stack;

            let newBase = positional.base + offset;
            let length = positional.length + named.length;
            for (let i = length - 1; i >= 0; i--) {
                stack.copy(i + positional.base, i + newBase);
            }
            positional.base += offset;
            named.base += offset;
            stack.sp += offset;
        }
    }
    capture() {
        let positional = this.positional.length === 0 ? EMPTY_POSITIONAL : this.positional.capture();
        let named = this.named.length === 0 ? EMPTY_NAMED : this.named.capture();
        return {
            tag: this.tag,
            length: this.length,
            positional,
            named
        };
    }
    clear() {
        let stack = this.stack,
            length = this.length;

        stack.pop(length);
    }
}
class PositionalArguments {
    constructor() {
        this.base = 0;
        this.length = 0;
        this.stack = null;
        this._tag = null;
        this._references = null;
    }
    setup(stack, base, length) {
        this.stack = stack;
        this.base = base;
        this.length = length;
        if (length === 0) {
            this._tag = CONSTANT_TAG;
            this._references = EMPTY_ARRAY;
        } else {
            this._tag = null;
            this._references = null;
        }
    }
    get tag() {
        let tag = this._tag;
        if (!tag) {
            tag = this._tag = combineTagged(this.references);
        }
        return tag;
    }
    at(position) {
        let base = this.base,
            length = this.length,
            stack = this.stack;

        if (position < 0 || position >= length) {
            return UNDEFINED_REFERENCE;
        }
        return stack.get(position, base);
    }
    capture() {
        return new CapturedPositionalArguments(this.tag, this.references);
    }
    prepend(other) {
        let additions = other.length;
        if (additions > 0) {
            let base = this.base,
                length = this.length,
                stack = this.stack;

            this.base = base = base - additions;
            this.length = length + additions;
            for (let i = 0; i < additions; i++) {
                stack.set(other.at(i), i, base);
            }
            this._tag = null;
            this._references = null;
        }
    }
    get references() {
        let references = this._references;
        if (!references) {
            let stack = this.stack,
                base = this.base,
                length = this.length;

            references = this._references = stack.sliceArray(base, base + length);
        }
        return references;
    }
}
class CapturedPositionalArguments {
    constructor(tag, references, length = references.length) {
        this.tag = tag;
        this.references = references;
        this.length = length;
    }
    static empty() {
        return new CapturedPositionalArguments(CONSTANT_TAG, EMPTY_ARRAY, 0);
    }
    at(position) {
        return this.references[position];
    }
    value() {
        return this.references.map(this.valueOf);
    }
    get(name) {
        let references = this.references,
            length = this.length;

        if (name === 'length') {
            return PrimitiveReference.create(length);
        } else {
            let idx = parseInt(name, 10);
            if (idx < 0 || idx >= length) {
                return UNDEFINED_REFERENCE;
            } else {
                return references[idx];
            }
        }
    }
    valueOf(reference) {
        return reference.value();
    }
}
class NamedArguments {
    constructor() {
        this.base = 0;
        this.length = 0;
        this._references = null;
        this._names = EMPTY_ARRAY;
        this._atNames = EMPTY_ARRAY;
    }
    setup(stack, base, length, names, synthetic) {
        this.stack = stack;
        this.base = base;
        this.length = length;
        if (length === 0) {
            this._references = EMPTY_ARRAY;
            this._names = EMPTY_ARRAY;
            this._atNames = EMPTY_ARRAY;
        } else {
            this._references = null;
            if (synthetic) {
                this._names = names;
                this._atNames = null;
            } else {
                this._names = null;
                this._atNames = names;
            }
        }
    }
    get tag() {
        return combineTagged(this.references);
    }
    get names() {
        let names = this._names;
        if (!names) {
            names = this._names = this._atNames.map(this.toSyntheticName);
        }
        return names;
    }
    get atNames() {
        let atNames = this._atNames;
        if (!atNames) {
            atNames = this._atNames = this._names.map(this.toAtName);
        }
        return atNames;
    }
    has(name) {
        return this.names.indexOf(name) !== -1;
    }
    get(name, synthetic = true) {
        let base = this.base,
            stack = this.stack;

        let names = synthetic ? this.names : this.atNames;
        let idx = names.indexOf(name);
        if (idx === -1) {
            return UNDEFINED_REFERENCE;
        }
        return stack.get(idx, base);
    }
    capture() {
        return new CapturedNamedArguments(this.tag, this.names, this.references);
    }
    merge(other) {
        let extras = other.length;

        if (extras > 0) {
            let names = this.names,
                length = this.length,
                stack = this.stack;
            let extraNames = other.names;

            if (Object.isFrozen(names) && names.length === 0) {
                names = [];
            }
            for (let i = 0; i < extras; i++) {
                let name = extraNames[i];
                let idx = names.indexOf(name);
                if (idx === -1) {
                    length = names.push(name);
                    stack.push(other.references[i]);
                }
            }
            this.length = length;
            this._references = null;
            this._names = names;
            this._atNames = null;
        }
    }
    get references() {
        let references = this._references;
        if (!references) {
            let base = this.base,
                length = this.length,
                stack = this.stack;

            references = this._references = stack.sliceArray(base, base + length);
        }
        return references;
    }
    toSyntheticName(name) {
        return name.slice(1);
    }
    toAtName(name) {
        return `@${name}`;
    }
}
class CapturedNamedArguments {
    constructor(tag, names, references) {
        this.tag = tag;
        this.names = names;
        this.references = references;
        this.length = names.length;
        this._map = null;
    }
    get map() {
        let map$$1 = this._map;
        if (!map$$1) {
            let names = this.names,
                references = this.references;

            map$$1 = this._map = dict();
            for (let i = 0; i < names.length; i++) {
                let name = names[i];
                map$$1[name] = references[i];
            }
        }
        return map$$1;
    }
    has(name) {
        return this.names.indexOf(name) !== -1;
    }
    get(name) {
        let names = this.names,
            references = this.references;

        let idx = names.indexOf(name);
        if (idx === -1) {
            return UNDEFINED_REFERENCE;
        } else {
            return references[idx];
        }
    }
    value() {
        let names = this.names,
            references = this.references;

        let out = dict();
        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            out[name] = references[i].value();
        }
        return out;
    }
}
class BlockArguments {
    constructor() {
        this.internalValues = null;
        this.internalTag = null;
        this.names = EMPTY_ARRAY;
        this.length = 0;
        this.base = 0;
    }
    setup(stack, base, length, names) {
        this.stack = stack;
        this.names = names;
        this.base = base;
        this.length = length;
        if (length === 0) {
            this.internalTag = CONSTANT_TAG;
            this.internalValues = EMPTY_ARRAY;
        } else {
            this.internalTag = null;
            this.internalValues = null;
        }
    }
    get values() {
        let values = this.internalValues;
        if (!values) {
            let base = this.base,
                length = this.length,
                stack = this.stack;

            values = this.internalValues = stack.sliceArray(base, base + length * 3);
        }
        return values;
    }
    has(name) {
        return this.names.indexOf(name) !== -1;
    }
    get(name) {
        let base = this.base,
            stack = this.stack,
            names = this.names;

        let idx = names.indexOf(name);
        if (names.indexOf(name) === -1) {
            return null;
        }
        let table = stack.get(idx * 3, base);
        let scope = stack.get(idx * 3 + 1, base); // FIXME(mmun): shouldn't need to cast this
        let handle = stack.get(idx * 3 + 2, base);
        return handle === null ? null : [handle, scope, table];
    }
    capture() {
        return new CapturedBlockArguments(this.names, this.values);
    }
}
class CapturedBlockArguments {
    constructor(names, values) {
        this.names = names;
        this.values = values;
        this.length = names.length;
    }
    has(name) {
        return this.names.indexOf(name) !== -1;
    }
    get(name) {
        let idx = this.names.indexOf(name);
        if (idx === -1) return null;
        return [this.values[idx * 3 + 2], this.values[idx * 3 + 1], this.values[idx * 3]];
    }
}
const EMPTY_NAMED = new CapturedNamedArguments(CONSTANT_TAG, EMPTY_ARRAY, EMPTY_ARRAY);
const EMPTY_POSITIONAL = new CapturedPositionalArguments(CONSTANT_TAG, EMPTY_ARRAY);
const EMPTY_ARGS = { tag: CONSTANT_TAG, length: 0, positional: EMPTY_POSITIONAL, named: EMPTY_NAMED };

const CURRIED_COMPONENT_DEFINITION_BRAND = 'CURRIED COMPONENT DEFINITION [id=6f00feb9-a0ef-4547-99ea-ac328f80acea]';
function isCurriedComponentDefinition(definition) {
    return !!(definition && definition[CURRIED_COMPONENT_DEFINITION_BRAND]);
}

class CurriedComponentDefinition {
    /** @internal */
    constructor(inner, args) {
        this.inner = inner;
        this.args = args;
        this[CURRIED_COMPONENT_DEFINITION_BRAND] = true;
    }
    unwrap(args) {
        args.realloc(this.offset);
        let definition = this;
        while (true) {
            var _definition = definition;
            let curriedArgs = _definition.args,
                inner = _definition.inner;

            if (curriedArgs) {
                args.positional.prepend(curriedArgs.positional);
                args.named.merge(curriedArgs.named);
            }
            if (!isCurriedComponentDefinition(inner)) {
                return inner;
            }
            definition = inner;
        }
    }
    /** @internal */
    get offset() {
        let inner = this.inner,
            args = this.args;

        let length = args ? args.positional.length : 0;
        return isCurriedComponentDefinition(inner) ? length + inner.offset : length;
    }
}

class IsCurriedComponentDefinitionReference extends ConditionalReference$1 {
    static create(inner) {
        return new IsCurriedComponentDefinitionReference(inner);
    }
    toBool(value) {
        return isCurriedComponentDefinition(value);
    }
}
APPEND_OPCODES.add(24 /* DynamicContent */, vm => {
    let reference = vm.stack.pop();
    let isTrusting = vm.fetchValue(Register.t0);
    let value = reference.value();
    let content;
    if (isTrusting) {
        content = vm.elements().appendTrustingDynamicContent(value);
    } else {
        content = vm.elements().appendCautiousDynamicContent(value);
    }
    if (!isConst(reference)) {
        vm.updateWith(new UpdateDynamicContentOpcode(reference, content));
    }
    vm.loadValue(Register.t0, null);
});
class UpdateDynamicContentOpcode extends UpdatingOpcode {
    constructor(reference, content) {
        super();
        this.reference = reference;
        this.content = content;
        this.tag = reference.tag;
    }
    evaluate(vm) {
        let content = this.content,
            reference = this.reference;

        content.update(vm.env, reference.value());
    }
}

APPEND_OPCODES.add(18 /* ChildScope */, vm => vm.pushChildScope());
APPEND_OPCODES.add(19 /* PopScope */, vm => vm.popScope());
APPEND_OPCODES.add(36 /* PushDynamicScope */, vm => vm.pushDynamicScope());
APPEND_OPCODES.add(37 /* PopDynamicScope */, vm => vm.popDynamicScope());
APPEND_OPCODES.add(10 /* Constant */, (vm, { op1: other }) => {
    vm.stack.push(vm.constants.getOther(other));
});
APPEND_OPCODES.add(11 /* Primitive */, (vm, { op1: primitive }) => {
    let stack = vm.stack;
    let flag = primitive & 7; // 111
    let value = primitive >> 3;
    switch (flag) {
        case 0 /* NUMBER */:
            stack.push(value);
            break;
        case 1 /* FLOAT */:
            stack.push(vm.constants.getFloat(value));
            break;
        case 2 /* STRING */:
            stack.push(vm.constants.getString(value));
            break;
        case 3 /* BOOLEAN_OR_VOID */:
            stack.pushEncodedImmediate(primitive);
            break;
        case 4 /* NEGATIVE */:
            stack.push(vm.constants.getNegative(value));
            break;
    }
});
APPEND_OPCODES.add(12 /* PrimitiveReference */, vm => {
    let stack = vm.stack;
    stack.push(PrimitiveReference.create(stack.pop()));
});
APPEND_OPCODES.add(13 /* Dup */, (vm, { op1: register, op2: offset }) => {
    let position = vm.fetchValue(register) - offset;
    vm.stack.dup(position);
});
APPEND_OPCODES.add(14 /* Pop */, (vm, { op1: count }) => {
    vm.stack.pop(count);
});
APPEND_OPCODES.add(15 /* Load */, (vm, { op1: register }) => {
    vm.load(register);
});
APPEND_OPCODES.add(16 /* Fetch */, (vm, { op1: register }) => {
    vm.fetch(register);
});
APPEND_OPCODES.add(35 /* BindDynamicScope */, (vm, { op1: _names }) => {
    let names = vm.constants.getArray(_names);
    vm.bindDynamicScope(names);
});
APPEND_OPCODES.add(49 /* Enter */, (vm, { op1: args }) => {
    vm.enter(args);
});
APPEND_OPCODES.add(50 /* Exit */, vm => {
    vm.exit();
});
APPEND_OPCODES.add(40 /* PushSymbolTable */, (vm, { op1: _table }) => {
    let stack = vm.stack;
    stack.push(vm.constants.getSerializable(_table));
});
APPEND_OPCODES.add(39 /* PushBlockScope */, vm => {
    let stack = vm.stack;
    stack.push(vm.scope());
});
APPEND_OPCODES.add(38 /* CompileBlock */, vm => {
    let stack = vm.stack;
    let block = stack.pop();
    if (block) {
        stack.pushSmi(block.compile());
    } else {
        stack.pushNull();
    }
});
APPEND_OPCODES.add(43 /* InvokeYield */, vm => {
    let stack = vm.stack;

    let handle = stack.pop();
    let scope = stack.pop(); // FIXME(mmun): shouldn't need to cast this
    let table = stack.pop();
    false && debugAssert(table === null || table && typeof table === 'object' && Array.isArray(table.parameters), stackAssert('Option<BlockSymbolTable>', table));

    let args = stack.pop();
    if (table === null) {
        // To balance the pop{Frame,Scope}
        vm.pushFrame();
        vm.pushScope(scope); // Could be null but it doesnt matter as it is immediatelly popped.
        return;
    }
    let invokingScope = scope;
    // If necessary, create a child scope
    {
        let locals = table.parameters;
        let localsCount = locals.length;
        if (localsCount > 0) {
            invokingScope = invokingScope.child();
            for (let i = 0; i < localsCount; i++) {
                invokingScope.bindSymbol(locals[i], args.at(i));
            }
        }
    }
    vm.pushFrame();
    vm.pushScope(invokingScope);
    vm.call(handle);
});
APPEND_OPCODES.add(45 /* JumpIf */, (vm, { op1: target }) => {
    let reference = vm.stack.pop();
    if (isConst(reference)) {
        if (reference.value()) {
            vm.goto(target);
        }
    } else {
        let cache = new ReferenceCache(reference);
        if (cache.peek()) {
            vm.goto(target);
        }
        vm.updateWith(new Assert(cache));
    }
});
APPEND_OPCODES.add(46 /* JumpUnless */, (vm, { op1: target }) => {
    let reference = vm.stack.pop();
    if (isConst(reference)) {
        if (!reference.value()) {
            vm.goto(target);
        }
    } else {
        let cache = new ReferenceCache(reference);
        if (!cache.peek()) {
            vm.goto(target);
        }
        vm.updateWith(new Assert(cache));
    }
});
APPEND_OPCODES.add(51 /* ToBoolean */, vm => {
    let env = vm.env,
        stack = vm.stack;

    stack.push(env.toConditionalReference(stack.pop()));
});
class Assert extends UpdatingOpcode {
    constructor(cache) {
        super();
        this.type = 'assert';
        this.tag = cache.tag;
        this.cache = cache;
    }
    evaluate(vm) {
        let cache = this.cache;

        if (isModified(cache.revalidate())) {
            vm.throw();
        }
    }
}
class JumpIfNotModifiedOpcode extends UpdatingOpcode {
    constructor(tag, target) {
        super();
        this.target = target;
        this.type = 'jump-if-not-modified';
        this.tag = tag;
        this.lastRevision = tag.value();
    }
    evaluate(vm) {
        let tag = this.tag,
            target = this.target,
            lastRevision = this.lastRevision;

        if (!vm.alwaysRevalidate && tag.validate(lastRevision)) {
            vm.goto(target);
        }
    }
    didModify() {
        this.lastRevision = this.tag.value();
    }
}
class DidModifyOpcode extends UpdatingOpcode {
    constructor(target) {
        super();
        this.target = target;
        this.type = 'did-modify';
        this.tag = CONSTANT_TAG;
    }
    evaluate() {
        this.target.didModify();
    }
}
class LabelOpcode {
    constructor(label) {
        this.tag = CONSTANT_TAG;
        this.type = 'label';
        this.label = null;
        this.prev = null;
        this.next = null;
        initializeGuid(this);
        this.label = label;
    }
    evaluate() {}
    inspect() {
        return `${this.label} [${this._guid}]`;
    }
}

APPEND_OPCODES.add(22 /* Text */, (vm, { op1: text }) => {
    vm.elements().appendText(vm.constants.getString(text));
});
APPEND_OPCODES.add(23 /* Comment */, (vm, { op1: text }) => {
    vm.elements().appendComment(vm.constants.getString(text));
});
APPEND_OPCODES.add(25 /* OpenElement */, (vm, { op1: tag }) => {
    vm.elements().openElement(vm.constants.getString(tag));
});
APPEND_OPCODES.add(26 /* OpenDynamicElement */, vm => {
    let tagName = vm.stack.pop().value();
    vm.elements().openElement(tagName);
});
APPEND_OPCODES.add(33 /* PushRemoteElement */, vm => {
    let elementRef = vm.stack.pop();
    let nextSiblingRef = vm.stack.pop();
    let guidRef = vm.stack.pop();
    let element;
    let nextSibling;
    let guid = guidRef.value();
    if (isConst(elementRef)) {
        element = elementRef.value();
    } else {
        let cache = new ReferenceCache(elementRef);
        element = cache.peek();
        vm.updateWith(new Assert(cache));
    }
    if (isConst(nextSiblingRef)) {
        nextSibling = nextSiblingRef.value();
    } else {
        let cache = new ReferenceCache(nextSiblingRef);
        nextSibling = cache.peek();
        vm.updateWith(new Assert(cache));
    }
    vm.elements().pushRemoteElement(element, guid, nextSibling);
});
APPEND_OPCODES.add(34 /* PopRemoteElement */, vm => {
    vm.elements().popRemoteElement();
});
APPEND_OPCODES.add(30 /* FlushElement */, vm => {
    let operations = vm.fetchValue(Register.t0);
    if (operations) {
        operations.flush(vm);
        vm.loadValue(Register.t0, null);
    }
    vm.elements().flushElement();
});
APPEND_OPCODES.add(31 /* CloseElement */, vm => {
    vm.elements().closeElement();
});
APPEND_OPCODES.add(32 /* Modifier */, (vm, { op1: handle }) => {
    let manager = vm.constants.resolveHandle(handle);
    let stack = vm.stack;
    let args = stack.pop();

    var _vm$elements = vm.elements();

    let element = _vm$elements.constructing,
        updateOperations = _vm$elements.updateOperations;

    let dynamicScope = vm.dynamicScope();
    let modifier = manager.create(element, args, dynamicScope, updateOperations);
    vm.env.scheduleInstallModifier(modifier, manager);
    let destructor = manager.getDestructor(modifier);
    if (destructor) {
        vm.newDestroyable(destructor);
    }
    let tag = manager.getTag(modifier);
    if (!isConstTag(tag)) {
        vm.updateWith(new UpdateModifierOpcode(tag, manager, modifier));
    }
});
class UpdateModifierOpcode extends UpdatingOpcode {
    constructor(tag, manager, modifier) {
        super();
        this.tag = tag;
        this.manager = manager;
        this.modifier = modifier;
        this.type = 'update-modifier';
        this.lastUpdated = tag.value();
    }
    evaluate(vm) {
        let manager = this.manager,
            modifier = this.modifier,
            tag = this.tag,
            lastUpdated = this.lastUpdated;

        if (!tag.validate(lastUpdated)) {
            vm.env.scheduleUpdateModifier(modifier, manager);
            this.lastUpdated = tag.value();
        }
    }
}
APPEND_OPCODES.add(27 /* StaticAttr */, (vm, { op1: _name, op2: _value, op3: _namespace }) => {
    let name = vm.constants.getString(_name);
    let value = vm.constants.getString(_value);
    let namespace = _namespace ? vm.constants.getString(_namespace) : null;
    vm.elements().setStaticAttribute(name, value, namespace);
});
APPEND_OPCODES.add(28 /* DynamicAttr */, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
    let name = vm.constants.getString(_name);
    let reference = vm.stack.pop();
    let value = reference.value();
    let namespace = _namespace ? vm.constants.getString(_namespace) : null;
    let attribute = vm.elements().setDynamicAttribute(name, value, !!trusting, namespace);
    if (!isConst(reference)) {
        vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
    }
});
class UpdateDynamicAttributeOpcode extends UpdatingOpcode {
    constructor(reference, attribute) {
        super();
        this.reference = reference;
        this.attribute = attribute;
        this.type = 'patch-element';
        this.tag = reference.tag;
        this.lastRevision = this.tag.value();
    }
    evaluate(vm) {
        let attribute = this.attribute,
            reference = this.reference,
            tag = this.tag;

        if (!tag.validate(this.lastRevision)) {
            this.lastRevision = tag.value();
            attribute.update(reference.value(), vm.env);
        }
    }
}

function resolveComponent(resolver, name, meta) {
    let definition = resolver.lookupComponent(name, meta);
    false && debugAssert(definition, `Could not find a component named "${name}"`);

    return definition;
}

class CurryComponentReference {
    constructor(inner, resolver, meta, args) {
        this.inner = inner;
        this.resolver = resolver;
        this.meta = meta;
        this.args = args;
        this.tag = inner.tag;
        this.lastValue = null;
        this.lastDefinition = null;
    }
    value() {
        let inner = this.inner,
            lastValue = this.lastValue;

        let value = inner.value();
        if (value === lastValue) {
            return this.lastDefinition;
        }
        let definition = null;
        if (isCurriedComponentDefinition(value)) {
            definition = value;
        } else if (typeof value === 'string' && value) {
            let resolver = this.resolver,
                meta = this.meta;

            definition = resolveComponent(resolver, value, meta);
        }
        definition = this.curry(definition);
        this.lastValue = value;
        this.lastDefinition = definition;
        return definition;
    }
    get() {
        return UNDEFINED_REFERENCE;
    }
    curry(definition) {
        let args = this.args;

        if (!args && isCurriedComponentDefinition(definition)) {
            return definition;
        } else if (!definition) {
            return null;
        } else {
            return new CurriedComponentDefinition(definition, args);
        }
    }
}

function normalizeStringValue(value) {
    if (isEmpty(value)) {
        return '';
    }
    return String(value);
}
function normalizeTrustedValue(value) {
    if (isEmpty(value)) {
        return '';
    }
    if (isString(value)) {
        return value;
    }
    if (isSafeString(value)) {
        return value.toHTML();
    }
    if (isNode(value)) {
        return value;
    }
    return String(value);
}
function isEmpty(value) {
    return value === null || value === undefined || typeof value.toString !== 'function';
}
function isSafeString(value) {
    return typeof value === 'object' && value !== null && typeof value.toHTML === 'function';
}
function isNode(value) {
    return typeof value === 'object' && value !== null && typeof value.nodeType === 'number';
}
function isFragment(value) {
    return isNode(value) && value.nodeType === 11;
}
function isString(value) {
    return typeof value === 'string';
}

class ClassListReference {
    constructor(list) {
        this.list = list;
        this.tag = combineTagged(list);
        this.list = list;
    }
    value() {
        let ret = [];
        let list = this.list;

        for (let i = 0; i < list.length; i++) {
            let value = normalizeStringValue(list[i].value());
            if (value) ret.push(value);
        }
        return ret.length === 0 ? null : ret.join(' ');
    }
}

/**
 * Converts a ComponentCapabilities object into a 32-bit integer representation.
 */
function capabilityFlagsFrom(capabilities) {
    return 0 | (capabilities.dynamicLayout ? 1 /* DynamicLayout */ : 0) | (capabilities.dynamicTag ? 2 /* DynamicTag */ : 0) | (capabilities.prepareArgs ? 4 /* PrepareArgs */ : 0) | (capabilities.createArgs ? 8 /* CreateArgs */ : 0) | (capabilities.attributeHook ? 16 /* AttributeHook */ : 0) | (capabilities.elementHook ? 32 /* ElementHook */ : 0);
}
function hasCapability(capabilities, capability) {
    return !!(capabilities & capability);
}

const ARGS = new Arguments();
APPEND_OPCODES.add(57 /* IsComponent */, vm => {
    let stack = vm.stack;
    let ref = stack.pop();
    stack.push(IsCurriedComponentDefinitionReference.create(ref));
});
APPEND_OPCODES.add(58 /* CurryComponent */, (vm, { op1: _meta }) => {
    let stack = vm.stack;
    let definition = stack.pop();
    let capturedArgs = stack.pop();
    let meta = vm.constants.getSerializable(_meta);
    let resolver = vm.constants.resolver;
    vm.loadValue(Register.v0, new CurryComponentReference(definition, resolver, meta, capturedArgs));
    // expectStackChange(vm.stack, -args.length - 1, 'CurryComponent');
});
APPEND_OPCODES.add(59 /* PushComponentDefinition */, (vm, { op1: handle }) => {
    let definition = vm.constants.resolveHandle(handle);
    false && debugAssert(!!definition, `Missing component for ${handle}`);

    let manager = definition.manager;

    let capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));
    let instance = {
        definition,
        manager,
        capabilities,
        state: null,
        handle: null,
        table: null
    };
    vm.stack.push(instance);
});
APPEND_OPCODES.add(62 /* ResolveDynamicComponent */, (vm, { op1: _meta }) => {
    let stack = vm.stack;
    let component = stack.pop().value();
    let meta = vm.constants.getSerializable(_meta);
    vm.loadValue(Register.t1, null); // Clear the temp register
    let definition;
    if (typeof component === 'string') {
        let resolver = vm.constants.resolver;

        let resolvedDefinition = resolveComponent(resolver, component, meta);
        definition = resolvedDefinition;
    } else if (isCurriedComponentDefinition(component)) {
        definition = component;
    } else {
        throw unreachable();
    }
    stack.push(definition);
});
APPEND_OPCODES.add(60 /* PushDynamicComponentInstance */, vm => {
    let stack = vm.stack;

    let definition = stack.pop();
    let capabilities, manager;
    if (isCurriedComponentDefinition(definition)) {
        manager = capabilities = null;
    } else {
        manager = definition.manager;
        capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));
    }
    stack.push({ definition, capabilities, manager, state: null, handle: null, table: null });
});
APPEND_OPCODES.add(61 /* PushCurriedComponent */, (vm, { op1: _meta }) => {
    let stack = vm.stack;
    let component = stack.pop().value();
    let definition;
    if (isCurriedComponentDefinition(component)) {
        definition = component;
    } else {
        throw unreachable();
    }
    stack.push(definition);
});
APPEND_OPCODES.add(63 /* PushArgs */, (vm, { op1: _names, op2: flags }) => {
    let stack = vm.stack;
    let names = vm.constants.getStringArray(_names);
    let positionalCount = flags >> 4;
    let synthetic = flags & 0b1000;
    let blockNames = [];
    if (flags & 0b0100) blockNames.push('main');
    if (flags & 0b0010) blockNames.push('else');
    if (flags & 0b0001) blockNames.push('attrs');
    ARGS.setup(stack, names, blockNames, positionalCount, !!synthetic);
    stack.push(ARGS);
});
APPEND_OPCODES.add(66 /* CaptureArgs */, vm => {
    let stack = vm.stack;
    let args = stack.pop();
    let capturedArgs = args.capture();
    stack.push(capturedArgs);
});
APPEND_OPCODES.add(65 /* PrepareArgs */, (vm, { op1: _state }) => {
    let stack = vm.stack;
    let instance = vm.fetchValue(_state);
    let args = stack.pop();
    let definition = instance.definition;

    if (isCurriedComponentDefinition(definition)) {
        false && debugAssert(!definition.manager, "If the component definition was curried, we don't yet have a manager");

        definition = resolveCurriedComponentDefinition(instance, definition, args);
    }
    var _definition = definition;
    let manager = _definition.manager,
        state = _definition.state;

    let capabilities = instance.capabilities;
    if (hasCapability(capabilities, 4 /* PrepareArgs */) !== true) {
        stack.push(args);
        return;
    }
    let blocks = args.blocks.values;
    let blockNames = args.blocks.names;
    let preparedArgs = manager.prepareArgs(state, args);
    if (preparedArgs) {
        args.clear();
        for (let i = 0; i < blocks.length; i++) {
            stack.push(blocks[i]);
        }
        let positional = preparedArgs.positional,
            named = preparedArgs.named;

        let positionalCount = positional.length;
        for (let i = 0; i < positionalCount; i++) {
            stack.push(positional[i]);
        }
        let names = Object.keys(named);
        for (let i = 0; i < names.length; i++) {
            stack.push(named[names[i]]);
        }
        args.setup(stack, names, blockNames, positionalCount, true);
    }
    stack.push(args);
});
function resolveCurriedComponentDefinition(instance, definition, args) {
    let unwrappedDefinition = instance.definition = definition.unwrap(args);
    let manager = unwrappedDefinition.manager,
        state = unwrappedDefinition.state;

    false && debugAssert(instance.manager === null, "component instance manager should not be populated yet");
    false && debugAssert(instance.capabilities === null, "component instance manager should not be populated yet");

    instance.manager = manager;
    instance.capabilities = capabilityFlagsFrom(manager.getCapabilities(state));
    return unwrappedDefinition;
}
APPEND_OPCODES.add(67 /* CreateComponent */, (vm, { op1: flags, op2: _state }) => {
    let dynamicScope = vm.dynamicScope();
    let instance = vm.fetchValue(_state);
    let definition = instance.definition,
        manager = instance.manager;

    let capabilities = instance.capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));
    let hasDefaultBlock = flags & 1;
    let args = null;
    if (hasCapability(capabilities, 8 /* CreateArgs */)) {
        args = vm.stack.peek();
    }
    let state = manager.create(vm.env, definition.state, args, dynamicScope, vm.getSelf(), !!hasDefaultBlock);
    // We want to reuse the `state` POJO here, because we know that the opcodes
    // only transition at exactly one place.
    instance.state = state;
    let tag = manager.getTag(state);
    if (!isConstTag(tag)) {
        vm.updateWith(new UpdateComponentOpcode(tag, state, manager, dynamicScope));
    }
});
APPEND_OPCODES.add(68 /* RegisterComponentDestructor */, (vm, { op1: _state }) => {
    var _vm$fetchValue = vm.fetchValue(_state);

    let manager = _vm$fetchValue.manager,
        state = _vm$fetchValue.state;

    let destructor = manager.getDestructor(state);
    if (destructor) vm.newDestroyable(destructor);
});
APPEND_OPCODES.add(75 /* BeginComponentTransaction */, vm => {
    vm.beginCacheGroup();
    vm.elements().pushSimpleBlock();
});
APPEND_OPCODES.add(69 /* PutComponentOperations */, vm => {
    vm.loadValue(Register.t0, new ComponentElementOperations());
});
APPEND_OPCODES.add(29 /* ComponentAttr */, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
    let name = vm.constants.getString(_name);
    let reference = vm.stack.pop();
    let namespace = _namespace ? vm.constants.getString(_namespace) : null;
    vm.fetchValue(Register.t0).setAttribute(name, reference, !!trusting, namespace);
});
class ComponentElementOperations {
    constructor() {
        this.attributes = dict();
        this.classes = [];
    }
    setAttribute(name, value, trusting, namespace) {
        let deferred = { value, namespace, trusting };
        if (name === 'class') {
            this.classes.push(value);
        }
        this.attributes[name] = deferred;
    }
    flush(vm) {
        for (let name in this.attributes) {
            let attr = this.attributes[name];
            let reference = attr.value,
                namespace = attr.namespace,
                trusting = attr.trusting;

            if (name === 'class') {
                reference = new ClassListReference(this.classes);
            }
            let attribute = vm.elements().setDynamicAttribute(name, reference.value(), trusting, namespace);
            if (!isConst(reference)) {
                vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
            }
        }
    }
}
APPEND_OPCODES.add(77 /* DidCreateElement */, (vm, { op1: _state }) => {
    var _vm$fetchValue2 = vm.fetchValue(_state);

    let definition = _vm$fetchValue2.definition,
        state = _vm$fetchValue2.state;
    let manager = definition.manager;

    let operations = vm.fetchValue(Register.t0);
    let action = 'DidCreateElementOpcode#evaluate';
    manager.didCreateElement(state, vm.elements().expectConstructing(action), operations);
});
APPEND_OPCODES.add(70 /* GetComponentSelf */, (vm, { op1: _state }) => {
    var _vm$fetchValue3 = vm.fetchValue(_state);

    let definition = _vm$fetchValue3.definition,
        state = _vm$fetchValue3.state;
    let manager = definition.manager;

    vm.stack.push(manager.getSelf(state));
});
APPEND_OPCODES.add(71 /* GetComponentTagName */, (vm, { op1: _state }) => {
    var _vm$fetchValue4 = vm.fetchValue(_state);

    let definition = _vm$fetchValue4.definition,
        state = _vm$fetchValue4.state;
    let manager = definition.manager;

    vm.stack.push(manager.getTagName(state));
});
// Dynamic Invocation Only
APPEND_OPCODES.add(72 /* GetComponentLayout */, (vm, { op1: _state }) => {
    let instance = vm.fetchValue(_state);
    let manager = instance.manager,
        definition = instance.definition;
    let resolver = vm.constants.resolver,
        stack = vm.stack;
    let instanceState = instance.state,
        capabilities = instance.capabilities;
    let definitionState = definition.state;

    let invoke;
    if (hasStaticLayout(capabilities, manager)) {
        invoke = manager.getLayout(definitionState, resolver);
    } else if (hasDynamicLayout(capabilities, manager)) {
        invoke = manager.getDynamicLayout(instanceState, resolver);
    } else {
        throw unreachable();
    }
    stack.push(invoke.symbolTable);
    stack.push(invoke.handle);
});
function hasStaticLayout(capabilities, _manager) {
    return hasCapability(capabilities, 1 /* DynamicLayout */) === false;
}
function hasDynamicLayout(capabilities, _manager) {
    return hasCapability(capabilities, 1 /* DynamicLayout */) === true;
}
APPEND_OPCODES.add(56 /* Main */, (vm, { op1: register }) => {
    let definition = vm.stack.pop();
    let invocation = vm.stack.pop();
    let manager = definition.manager;

    let capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));
    let state = {
        definition,
        manager,
        capabilities,
        state: null,
        handle: invocation.handle,
        table: invocation.symbolTable
    };
    vm.loadValue(register, state);
});
APPEND_OPCODES.add(73 /* PopulateLayout */, (vm, { op1: _state }) => {
    let stack = vm.stack;

    let handle = stack.pop();
    let table = stack.pop();
    let state = vm.fetchValue(_state);
    state.handle = handle;
    state.table = table;
});
// Dynamic Invocation Only
APPEND_OPCODES.add(74 /* InvokeComponentLayout */, (vm, { op1: _state }) => {
    let stack = vm.stack;

    var _vm$fetchValue5 = vm.fetchValue(_state);

    let handle = _vm$fetchValue5.handle;
    var _vm$fetchValue5$table = _vm$fetchValue5.table;
    let symbols = _vm$fetchValue5$table.symbols,
        hasEval = _vm$fetchValue5$table.hasEval;

    {
        let self = stack.pop();
        let scope = vm.pushRootScope(symbols.length + 1, true);
        scope.bindSelf(self);
        let args = vm.stack.pop();
        let lookup = null;
        if (hasEval) {
            lookup = dict();
        }
        let callerNames = args.named.atNames;
        for (let i = callerNames.length - 1; i >= 0; i--) {
            let atName = callerNames[i];
            let symbol = symbols.indexOf(callerNames[i]);
            let value = args.named.get(atName, false);
            if (symbol !== -1) scope.bindSymbol(symbol + 1, value);
            if (hasEval) lookup[atName] = value;
        }
        let bindBlock = (symbolName, blockName) => {
            let symbol = symbols.indexOf(symbolName);
            let block = blocks.get(blockName);
            if (symbol !== -1) {
                scope.bindBlock(symbol + 1, block);
            }
            if (lookup) lookup[symbolName] = block;
        };
        let blocks = args.blocks;
        bindBlock(ATTRS_BLOCK, 'attrs');
        bindBlock('&inverse', 'else');
        bindBlock('&default', 'main');
        if (lookup) scope.bindEvalScope(lookup);
        vm.call(handle);
    }
});
APPEND_OPCODES.add(78 /* DidRenderLayout */, (vm, { op1: _state }) => {
    var _vm$fetchValue6 = vm.fetchValue(_state);

    let manager = _vm$fetchValue6.manager,
        state = _vm$fetchValue6.state;

    let bounds = vm.elements().popBlock();
    let mgr = manager;
    mgr.didRenderLayout(state, bounds);
    vm.env.didCreate(state, manager);
    vm.updateWith(new DidUpdateLayoutOpcode(manager, state, bounds));
});
APPEND_OPCODES.add(76 /* CommitComponentTransaction */, vm => {
    vm.commitCacheGroup();
});
class UpdateComponentOpcode extends UpdatingOpcode {
    constructor(tag, component, manager, dynamicScope) {
        super();
        this.tag = tag;
        this.component = component;
        this.manager = manager;
        this.dynamicScope = dynamicScope;
        this.type = 'update-component';
    }
    evaluate(_vm) {
        let component = this.component,
            manager = this.manager,
            dynamicScope = this.dynamicScope;

        manager.update(component, dynamicScope);
    }
}
class DidUpdateLayoutOpcode extends UpdatingOpcode {
    constructor(manager, component, bounds) {
        super();
        this.manager = manager;
        this.component = component;
        this.bounds = bounds;
        this.type = 'did-update-layout';
        this.tag = CONSTANT_TAG;
    }
    evaluate(vm) {
        let manager = this.manager,
            component = this.component,
            bounds = this.bounds;

        manager.didUpdateLayout(component, bounds);
        vm.env.didUpdate(component, manager);
    }
}

/* tslint:disable */
function debugCallback(context, get) {
    console.info('Use `context`, and `get(<path>)` to debug this template.');
    // for example...
    context === get('this');
    debugger;
}
/* tslint:enable */
let callback = debugCallback;
// For testing purposes


class ScopeInspector {
    constructor(scope, symbols, evalInfo) {
        this.scope = scope;
        this.locals = dict();
        for (let i = 0; i < evalInfo.length; i++) {
            let slot = evalInfo[i];
            let name = symbols[slot - 1];
            let ref = scope.getSymbol(slot);
            this.locals[name] = ref;
        }
    }
    get(path) {
        let scope = this.scope,
            locals = this.locals;

        let parts = path.split('.');

        var _path$split = path.split('.');

        let head = _path$split[0],
            tail = _path$split.slice(1);

        let evalScope = scope.getEvalScope();
        let ref;
        if (head === 'this') {
            ref = scope.getSelf();
        } else if (locals[head]) {
            ref = locals[head];
        } else if (head.indexOf('@') === 0 && evalScope[head]) {
            ref = evalScope[head];
        } else {
            ref = this.scope.getSelf();
            tail = parts;
        }
        return tail.reduce((r, part) => r.get(part), ref);
    }
}
APPEND_OPCODES.add(81 /* Debugger */, (vm, { op1: _symbols, op2: _evalInfo }) => {
    let symbols = vm.constants.getStringArray(_symbols);
    let evalInfo = vm.constants.getArray(_evalInfo);
    let inspector = new ScopeInspector(vm.scope(), symbols, evalInfo);
    callback(vm.getSelf().value(), path => inspector.get(path).value());
});

APPEND_OPCODES.add(79 /* InvokePartial */, (vm, { op1: _meta, op2: _symbols, op3: _evalInfo }) => {
    let constants = vm.constants,
        resolver = vm.constants.resolver,
        stack = vm.stack;

    let name = stack.pop().value();
    false && debugAssert(typeof name === 'string', `Could not find a partial named "${String(name)}"`);

    let meta = constants.getSerializable(_meta);
    let outerSymbols = constants.getStringArray(_symbols);
    let evalInfo = constants.getArray(_evalInfo);
    let handle = resolver.lookupPartial(name, meta);
    false && debugAssert(handle, `Could not find a partial named "${name}"`);

    let definition = resolver.resolve(handle);

    var _definition$getPartia = definition.getPartial();

    let symbolTable = _definition$getPartia.symbolTable,
        vmHandle = _definition$getPartia.handle;

    {
        let partialSymbols = symbolTable.symbols;
        let outerScope = vm.scope();
        let partialScope = vm.pushRootScope(partialSymbols.length, false);
        let evalScope = outerScope.getEvalScope();
        partialScope.bindCallerScope(outerScope.getCallerScope());
        partialScope.bindEvalScope(evalScope);
        partialScope.bindSelf(outerScope.getSelf());
        let locals = Object.create(outerScope.getPartialMap());
        for (let i = 0; i < evalInfo.length; i++) {
            let slot = evalInfo[i];
            let name = outerSymbols[slot - 1];
            let ref = outerScope.getSymbol(slot);
            locals[name] = ref;
        }
        if (evalScope) {
            for (let i = 0; i < partialSymbols.length; i++) {
                let name = partialSymbols[i];
                let symbol = i + 1;
                let value = evalScope[name];
                if (value !== undefined) partialScope.bind(symbol, value);
            }
        }
        partialScope.bindPartialMap(locals);
        vm.pushFrame(); // sp += 2
        vm.call(vmHandle);
    }
});

class IterablePresenceReference {
    constructor(artifacts) {
        this.tag = artifacts.tag;
        this.artifacts = artifacts;
    }
    value() {
        return !this.artifacts.isEmpty();
    }
}
APPEND_OPCODES.add(54 /* PutIterator */, vm => {
    let stack = vm.stack;
    let listRef = stack.pop();
    let key = stack.pop();
    let iterable = vm.env.iterableFor(listRef, key.value());
    let iterator = new ReferenceIterator(iterable);
    stack.push(iterator);
    stack.push(new IterablePresenceReference(iterator.artifacts));
});
APPEND_OPCODES.add(52 /* EnterList */, (vm, { op1: relativeStart }) => {
    vm.enterList(relativeStart);
});
APPEND_OPCODES.add(53 /* ExitList */, vm => {
    vm.exitList();
});
APPEND_OPCODES.add(55 /* Iterate */, (vm, { op1: breaks }) => {
    let stack = vm.stack;
    let item = stack.peek().next();
    if (item) {
        let tryOpcode = vm.iterate(item.memo, item.value);
        vm.enterItem(item.key, tryOpcode);
    } else {
        vm.goto(breaks);
    }
});

class Cursor {
    constructor(element, nextSibling) {
        this.element = element;
        this.nextSibling = nextSibling;
    }
}
class ConcreteBounds {
    constructor(parentNode, first, last) {
        this.parentNode = parentNode;
        this.first = first;
        this.last = last;
    }
    parentElement() {
        return this.parentNode;
    }
    firstNode() {
        return this.first;
    }
    lastNode() {
        return this.last;
    }
}
class SingleNodeBounds {
    constructor(parentNode, node) {
        this.parentNode = parentNode;
        this.node = node;
    }
    parentElement() {
        return this.parentNode;
    }
    firstNode() {
        return this.node;
    }
    lastNode() {
        return this.node;
    }
}
function bounds(parent, first, last) {
    return new ConcreteBounds(parent, first, last);
}
function single(parent, node) {
    return new SingleNodeBounds(parent, node);
}
function move(bounds, reference) {
    let parent = bounds.parentElement();
    let first = bounds.firstNode();
    let last = bounds.lastNode();
    let node = first;
    while (node) {
        let next = node.nextSibling;
        parent.insertBefore(node, reference);
        if (node === last) return next;
        node = next;
    }
    return null;
}
function clear(bounds) {
    let parent = bounds.parentElement();
    let first = bounds.firstNode();
    let last = bounds.lastNode();
    let node = first;
    while (node) {
        let next = node.nextSibling;
        parent.removeChild(node);
        if (node === last) return next;
        node = next;
    }
    return null;
}

const SVG_NAMESPACE$1 = 'http://www.w3.org/2000/svg';
// Patch:    insertAdjacentHTML on SVG Fix
// Browsers: Safari, IE, Edge, Firefox ~33-34
// Reason:   insertAdjacentHTML does not exist on SVG elements in Safari. It is
//           present but throws an exception on IE and Edge. Old versions of
//           Firefox create nodes in the incorrect namespace.
// Fix:      Since IE and Edge silently fail to create SVG nodes using
//           innerHTML, and because Firefox may create nodes in the incorrect
//           namespace using innerHTML on SVG elements, an HTML-string wrapping
//           approach is used. A pre/post SVG tag is added to the string, then
//           that whole string is added to a div. The created nodes are plucked
//           out and applied to the target location on DOM.
function applySVGInnerHTMLFix(document, DOMClass, svgNamespace) {
    if (!document) return DOMClass;
    if (!shouldApplyFix(document, svgNamespace)) {
        return DOMClass;
    }
    let div = document.createElement('div');
    return class DOMChangesWithSVGInnerHTMLFix extends DOMClass {
        insertHTMLBefore(parent, nextSibling, html) {
            if (html === null || html === '') {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            if (parent.namespaceURI !== svgNamespace) {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            return fixSVG(parent, div, html, nextSibling);
        }
    };
}
function fixSVG(parent, div, html, reference) {
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
    // namespaced elements. So here a wrapper is used.
    let wrappedHtml = '<svg>' + html + '</svg>';
    div.innerHTML = wrappedHtml;

    var _moveNodesBefore = moveNodesBefore(div.firstChild, parent, reference);

    let first = _moveNodesBefore[0],
        last = _moveNodesBefore[1];

    return new ConcreteBounds(parent, first, last);
}
function shouldApplyFix(document, svgNamespace) {
    let svg = document.createElementNS(svgNamespace, 'svg');
    try {
        svg['insertAdjacentHTML']('beforeend', '<circle></circle>');
    } catch (e) {
        // IE, Edge: Will throw, insertAdjacentHTML is unsupported on SVG
        // Safari: Will throw, insertAdjacentHTML is not present on SVG
    } finally {
        // FF: Old versions will create a node in the wrong namespace
        if (svg.childNodes.length === 1 && svg.firstChild.namespaceURI === SVG_NAMESPACE$1) {
            // The test worked as expected, no fix required
            return false;
        }
        return true;
    }
}

// Patch:    Adjacent text node merging fix
// Browsers: IE, Edge, Firefox w/o inspector open
// Reason:   These browsers will merge adjacent text nodes. For exmaple given
//           <div>Hello</div> with div.insertAdjacentHTML(' world') browsers
//           with proper behavior will populate div.childNodes with two items.
//           These browsers will populate it with one merged node instead.
// Fix:      Add these nodes to a wrapper element, then iterate the childNodes
//           of that wrapper and move the nodes to their target location. Note
//           that potential SVG bugs will have been handled before this fix.
//           Note that this fix must only apply to the previous text node, as
//           the base implementation of `insertHTMLBefore` already handles
//           following text nodes correctly.
function applyTextNodeMergingFix(document, DOMClass) {
    if (!document) return DOMClass;
    if (!shouldApplyFix$1(document)) {
        return DOMClass;
    }
    return class DOMChangesWithTextNodeMergingFix extends DOMClass {
        constructor(document) {
            super(document);
            this.uselessComment = document.createComment('');
        }
        insertHTMLBefore(parent, nextSibling, html) {
            if (html === null) {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            let didSetUselessComment = false;
            let nextPrevious = nextSibling ? nextSibling.previousSibling : parent.lastChild;
            if (nextPrevious && nextPrevious instanceof Text) {
                didSetUselessComment = true;
                parent.insertBefore(this.uselessComment, nextSibling);
            }
            let bounds = super.insertHTMLBefore(parent, nextSibling, html);
            if (didSetUselessComment) {
                parent.removeChild(this.uselessComment);
            }
            return bounds;
        }
    };
}
function shouldApplyFix$1(document) {
    let mergingTextDiv = document.createElement('div');
    mergingTextDiv.innerHTML = 'first';
    mergingTextDiv.insertAdjacentHTML('beforeend', 'second');
    if (mergingTextDiv.childNodes.length === 2) {
        // It worked as expected, no fix required
        return false;
    }
    return true;
}

const SVG_NAMESPACE$$1 = 'http://www.w3.org/2000/svg';
// http://www.w3.org/TR/html/syntax.html#html-integration-point
const SVG_INTEGRATION_POINTS = { foreignObject: 1, desc: 1, title: 1 };
// http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
// TODO: Adjust SVG attributes
// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
// TODO: Adjust SVG elements
// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
const BLACKLIST_TABLE = Object.create(null);
["b", "big", "blockquote", "body", "br", "center", "code", "dd", "div", "dl", "dt", "em", "embed", "h1", "h2", "h3", "h4", "h5", "h6", "head", "hr", "i", "img", "li", "listing", "main", "meta", "nobr", "ol", "p", "pre", "ruby", "s", "small", "span", "strong", "strike", "sub", "sup", "table", "tt", "u", "ul", "var"].forEach(tag => BLACKLIST_TABLE[tag] = 1);
let doc = typeof document === 'undefined' ? null : document;

function moveNodesBefore(source, target, nextSibling) {
    let first = source.firstChild;
    let last = null;
    let current = first;
    while (current) {
        last = current;
        current = current.nextSibling;
        target.insertBefore(last, nextSibling);
    }
    return [first, last];
}
class DOMOperations {
    constructor(document) {
        this.document = document;
        this.setupUselessElement();
    }
    // split into seperate method so that NodeDOMTreeConstruction
    // can override it.
    setupUselessElement() {
        this.uselessElement = this.document.createElement('div');
    }
    createElement(tag, context) {
        let isElementInSVGNamespace, isHTMLIntegrationPoint;
        if (context) {
            isElementInSVGNamespace = context.namespaceURI === SVG_NAMESPACE$$1 || tag === 'svg';
            isHTMLIntegrationPoint = SVG_INTEGRATION_POINTS[context.tagName];
        } else {
            isElementInSVGNamespace = tag === 'svg';
            isHTMLIntegrationPoint = false;
        }
        if (isElementInSVGNamespace && !isHTMLIntegrationPoint) {
            // FIXME: This does not properly handle <font> with color, face, or
            // size attributes, which is also disallowed by the spec. We should fix
            // this.
            if (BLACKLIST_TABLE[tag]) {
                throw new Error(`Cannot create a ${tag} inside an SVG context`);
            }
            return this.document.createElementNS(SVG_NAMESPACE$$1, tag);
        } else {
            return this.document.createElement(tag);
        }
    }
    insertBefore(parent, node, reference) {
        parent.insertBefore(node, reference);
    }
    insertHTMLBefore(_parent, nextSibling, html) {
        return insertHTMLBefore(this.uselessElement, _parent, nextSibling, html);
    }
    createTextNode(text) {
        return this.document.createTextNode(text);
    }
    createComment(data) {
        return this.document.createComment(data);
    }
}
var DOM;
(function (DOM) {
    class TreeConstruction extends DOMOperations {
        createElementNS(namespace, tag) {
            return this.document.createElementNS(namespace, tag);
        }
        setAttribute(element, name, value, namespace = null) {
            if (namespace) {
                element.setAttributeNS(namespace, name, value);
            } else {
                element.setAttribute(name, value);
            }
        }
    }
    DOM.TreeConstruction = TreeConstruction;
    let appliedTreeContruction = TreeConstruction;
    appliedTreeContruction = applyTextNodeMergingFix(doc, appliedTreeContruction);
    appliedTreeContruction = applySVGInnerHTMLFix(doc, appliedTreeContruction, SVG_NAMESPACE$$1);
    DOM.DOMTreeConstruction = appliedTreeContruction;
})(DOM || (DOM = {}));
class DOMChanges extends DOMOperations {
    constructor(document) {
        super(document);
        this.document = document;
        this.namespace = null;
    }
    setAttribute(element, name, value) {
        element.setAttribute(name, value);
    }
    removeAttribute(element, name) {
        element.removeAttribute(name);
    }
    insertAfter(element, node, reference) {
        this.insertBefore(element, node, reference.nextSibling);
    }
}
function insertHTMLBefore(useless, _parent, _nextSibling, html) {
    // TypeScript vendored an old version of the DOM spec where `insertAdjacentHTML`
    // only exists on `HTMLElement` but not on `Element`. We actually work with the
    // newer version of the DOM API here (and monkey-patch this method in `./compat`
    // when we detect older browsers). This is a hack to work around this limitation.
    let parent = _parent;
    let nextSibling = _nextSibling;
    let prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
    let last;
    if (html === null || html === '') {
        return new ConcreteBounds(parent, null, null);
    }
    if (nextSibling === null) {
        parent.insertAdjacentHTML('beforeend', html);
        last = parent.lastChild;
    } else if (nextSibling instanceof HTMLElement) {
        nextSibling.insertAdjacentHTML('beforebegin', html);
        last = nextSibling.previousSibling;
    } else {
        // Non-element nodes do not support insertAdjacentHTML, so add an
        // element and call it on that element. Then remove the element.
        //
        // This also protects Edge, IE and Firefox w/o the inspector open
        // from merging adjacent text nodes. See ./compat/text-node-merging-fix.ts
        parent.insertBefore(useless, nextSibling);
        useless.insertAdjacentHTML('beforebegin', html);
        last = useless.previousSibling;
        parent.removeChild(useless);
    }
    let first = prev ? prev.nextSibling : parent.firstChild;
    return new ConcreteBounds(parent, first, last);
}
let helper = DOMChanges;
helper = applyTextNodeMergingFix(doc, helper);
helper = applySVGInnerHTMLFix(doc, helper, SVG_NAMESPACE$$1);
var DOMChanges$1 = helper;
const DOMTreeConstruction = DOM.DOMTreeConstruction;

const badProtocols = ['javascript:', 'vbscript:'];
const badTags = ['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM'];
const badTagsForDataURI = ['EMBED'];
const badAttributes = ['href', 'src', 'background', 'action'];
const badAttributesForDataURI = ['src'];
function has(array, item) {
    return array.indexOf(item) !== -1;
}
function checkURI(tagName, attribute) {
    return (tagName === null || has(badTags, tagName)) && has(badAttributes, attribute);
}
function checkDataURI(tagName, attribute) {
    if (tagName === null) return false;
    return has(badTagsForDataURI, tagName) && has(badAttributesForDataURI, attribute);
}
function requiresSanitization(tagName, attribute) {
    return checkURI(tagName, attribute) || checkDataURI(tagName, attribute);
}
function sanitizeAttributeValue(env, element, attribute, value) {
    let tagName = null;
    if (value === null || value === undefined) {
        return value;
    }
    if (isSafeString(value)) {
        return value.toHTML();
    }
    if (!element) {
        tagName = null;
    } else {
        tagName = element.tagName.toUpperCase();
    }
    let str = normalizeStringValue(value);
    if (checkURI(tagName, attribute)) {
        let protocol = env.protocolForURL(str);
        if (has(badProtocols, protocol)) {
            return `unsafe:${str}`;
        }
    }
    if (checkDataURI(tagName, attribute)) {
        return `unsafe:${str}`;
    }
    return str;
}

/*
 * @method normalizeProperty
 * @param element {HTMLElement}
 * @param slotName {String}
 * @returns {Object} { name, type }
 */
function normalizeProperty(element, slotName) {
    let type, normalized;
    if (slotName in element) {
        normalized = slotName;
        type = 'prop';
    } else {
        let lower = slotName.toLowerCase();
        if (lower in element) {
            type = 'prop';
            normalized = lower;
        } else {
            type = 'attr';
            normalized = slotName;
        }
    }
    if (type === 'prop' && (normalized.toLowerCase() === 'style' || preferAttr(element.tagName, normalized))) {
        type = 'attr';
    }
    return { normalized, type };
}

// properties that MUST be set as attributes, due to:
// * browser bug
// * strange spec outlier
const ATTR_OVERRIDES = {
    INPUT: {
        form: true,
        // Chrome 46.0.2464.0: 'autocorrect' in document.createElement('input') === false
        // Safari 8.0.7: 'autocorrect' in document.createElement('input') === false
        // Mobile Safari (iOS 8.4 simulator): 'autocorrect' in document.createElement('input') === true
        autocorrect: true,
        // Chrome 54.0.2840.98: 'list' in document.createElement('input') === true
        // Safari 9.1.3: 'list' in document.createElement('input') === false
        list: true
    },
    // element.form is actually a legitimate readOnly property, that is to be
    // mutated, but must be mutated by setAttribute...
    SELECT: { form: true },
    OPTION: { form: true },
    TEXTAREA: { form: true },
    LABEL: { form: true },
    FIELDSET: { form: true },
    LEGEND: { form: true },
    OBJECT: { form: true }
};
function preferAttr(tagName, propName) {
    let tag = ATTR_OVERRIDES[tagName.toUpperCase()];
    return tag && tag[propName.toLowerCase()] || false;
}

function defaultDynamicAttributes(element, attr) {
    let tagName = element.tagName,
        namespaceURI = element.namespaceURI;

    if (namespaceURI === SVG_NAMESPACE$$1) {
        return defaultDynamicAttribute(tagName, attr);
    }

    var _normalizeProperty = normalizeProperty(element, attr);

    let type = _normalizeProperty.type,
        normalized = _normalizeProperty.normalized;

    if (type === 'attr') {
        return defaultDynamicAttribute(tagName, normalized);
    } else {
        return defaultDynamicProperty(tagName, normalized);
    }
}
function defaultDynamicAttribute(tagName, name) {
    if (requiresSanitization(tagName, name)) {
        return SafeDynamicAttribute;
    } else {
        return SimpleDynamicAttribute;
    }
}
function defaultDynamicProperty(tagName, name) {
    if (requiresSanitization(tagName, name)) {
        return SafeDynamicProperty;
    }
    if (isUserInputValue(tagName, name)) {
        return InputValueDynamicAttribute;
    }
    if (isOptionSelected(tagName, name)) {
        return OptionSelectedDynamicAttribute;
    }
    return DefaultDynamicProperty;
}
class DynamicAttribute {
    constructor(attribute) {
        this.attribute = attribute;
    }
}
class SimpleDynamicAttribute extends DynamicAttribute {
    set(dom, value, _env) {
        let normalizedValue = normalizeValue(value);
        if (normalizedValue !== null) {
            var _attribute = this.attribute;
            let name = _attribute.name,
                namespace = _attribute.namespace;

            dom.__setAttribute(name, normalizedValue, namespace);
        }
    }
    update(value, _env) {
        let normalizedValue = normalizeValue(value);
        var _attribute2 = this.attribute;
        let element = _attribute2.element,
            name = _attribute2.name;

        if (normalizedValue === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, normalizedValue);
        }
    }
}
class DefaultDynamicProperty extends DynamicAttribute {
    set(dom, value, _env) {
        if (value !== null && value !== undefined) {
            let name = this.attribute.name;

            this.value = value;
            dom.__setProperty(name, value);
        }
    }
    update(value, _env) {
        var _attribute3 = this.attribute;
        let element = _attribute3.element,
            name = _attribute3.name;

        if (this.value !== value) {
            element[name] = this.value = value;
            if (value === null || value === undefined) {
                this.removeAttribute();
            }
        }
    }
    removeAttribute() {
        // TODO this sucks but to preserve properties first and to meet current
        // semantics we must do this.
        var _attribute4 = this.attribute;
        let element = _attribute4.element,
            name = _attribute4.name,
            namespace = _attribute4.namespace;

        if (namespace) {
            element.removeAttributeNS(namespace, name);
        } else {
            element.removeAttribute(name);
        }
    }
}
class SafeDynamicProperty extends DefaultDynamicProperty {
    set(dom, value, env) {
        var _attribute5 = this.attribute;
        let element = _attribute5.element,
            name = _attribute5.name;

        let sanitized = sanitizeAttributeValue(env, element, name, value);
        super.set(dom, sanitized, env);
    }
    update(value, env) {
        var _attribute6 = this.attribute;
        let element = _attribute6.element,
            name = _attribute6.name;

        let sanitized = sanitizeAttributeValue(env, element, name, value);
        super.update(sanitized, env);
    }
}
class SafeDynamicAttribute extends SimpleDynamicAttribute {
    set(dom, value, env) {
        var _attribute7 = this.attribute;
        let element = _attribute7.element,
            name = _attribute7.name;

        let sanitized = sanitizeAttributeValue(env, element, name, value);
        super.set(dom, sanitized, env);
    }
    update(value, env) {
        var _attribute8 = this.attribute;
        let element = _attribute8.element,
            name = _attribute8.name;

        let sanitized = sanitizeAttributeValue(env, element, name, value);
        super.update(sanitized, env);
    }
}
class InputValueDynamicAttribute extends DefaultDynamicProperty {
    set(dom, value) {
        dom.__setProperty('value', normalizeStringValue(value));
    }
    update(value) {
        let input = this.attribute.element;
        let currentValue = input.value;
        let normalizedValue = normalizeStringValue(value);
        if (currentValue !== normalizedValue) {
            input.value = normalizedValue;
        }
    }
}
class OptionSelectedDynamicAttribute extends DefaultDynamicProperty {
    set(dom, value) {
        if (value !== null && value !== undefined && value !== false) {
            dom.__setProperty('selected', true);
        }
    }
    update(value) {
        let option = this.attribute.element;
        if (value) {
            option.selected = true;
        } else {
            option.selected = false;
        }
    }
}
function isOptionSelected(tagName, attribute) {
    return tagName === 'OPTION' && attribute === 'selected';
}
function isUserInputValue(tagName, attribute) {
    return (tagName === 'INPUT' || tagName === 'TEXTAREA') && attribute === 'value';
}
function normalizeValue(value) {
    if (value === false || value === undefined || value === null || typeof value.toString === 'undefined') {
        return null;
    }
    if (value === true) {
        return '';
    }
    // onclick function etc in SSR
    if (typeof value === 'function') {
        return null;
    }
    return String(value);
}

class Scope {
    constructor(
    // the 0th slot is `self`
    slots, callerScope,
    // named arguments and blocks passed to a layout that uses eval
    evalScope,
    // locals in scope when the partial was invoked
    partialMap) {
        this.slots = slots;
        this.callerScope = callerScope;
        this.evalScope = evalScope;
        this.partialMap = partialMap;
    }
    static root(self, size = 0) {
        let refs = new Array(size + 1);
        for (let i = 0; i <= size; i++) {
            refs[i] = UNDEFINED_REFERENCE;
        }
        return new Scope(refs, null, null, null).init({ self });
    }
    static sized(size = 0) {
        let refs = new Array(size + 1);
        for (let i = 0; i <= size; i++) {
            refs[i] = UNDEFINED_REFERENCE;
        }
        return new Scope(refs, null, null, null);
    }
    init({ self }) {
        this.slots[0] = self;
        return this;
    }
    getSelf() {
        return this.get(0);
    }
    getSymbol(symbol) {
        return this.get(symbol);
    }
    getBlock(symbol) {
        return this.get(symbol);
    }
    getEvalScope() {
        return this.evalScope;
    }
    getPartialMap() {
        return this.partialMap;
    }
    bind(symbol, value) {
        this.set(symbol, value);
    }
    bindSelf(self) {
        this.set(0, self);
    }
    bindSymbol(symbol, value) {
        this.set(symbol, value);
    }
    bindBlock(symbol, value) {
        this.set(symbol, value);
    }
    bindEvalScope(map) {
        this.evalScope = map;
    }
    bindPartialMap(map) {
        this.partialMap = map;
    }
    bindCallerScope(scope) {
        this.callerScope = scope;
    }
    getCallerScope() {
        return this.callerScope;
    }
    child() {
        return new Scope(this.slots.slice(), this.callerScope, this.evalScope, this.partialMap);
    }
    get(index) {
        if (index >= this.slots.length) {
            throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
        }
        return this.slots[index];
    }
    set(index, value) {
        if (index >= this.slots.length) {
            throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
        }
        this.slots[index] = value;
    }
}
class Transaction {
    constructor() {
        this.scheduledInstallManagers = [];
        this.scheduledInstallModifiers = [];
        this.scheduledUpdateModifierManagers = [];
        this.scheduledUpdateModifiers = [];
        this.createdComponents = [];
        this.createdManagers = [];
        this.updatedComponents = [];
        this.updatedManagers = [];
        this.destructors = [];
    }
    didCreate(component, manager) {
        this.createdComponents.push(component);
        this.createdManagers.push(manager);
    }
    didUpdate(component, manager) {
        this.updatedComponents.push(component);
        this.updatedManagers.push(manager);
    }
    scheduleInstallModifier(modifier, manager) {
        this.scheduledInstallManagers.push(manager);
        this.scheduledInstallModifiers.push(modifier);
    }
    scheduleUpdateModifier(modifier, manager) {
        this.scheduledUpdateModifierManagers.push(manager);
        this.scheduledUpdateModifiers.push(modifier);
    }
    didDestroy(d) {
        this.destructors.push(d);
    }
    commit() {
        let createdComponents = this.createdComponents,
            createdManagers = this.createdManagers;

        for (let i = 0; i < createdComponents.length; i++) {
            let component = createdComponents[i];
            let manager = createdManagers[i];
            manager.didCreate(component);
        }
        let updatedComponents = this.updatedComponents,
            updatedManagers = this.updatedManagers;

        for (let i = 0; i < updatedComponents.length; i++) {
            let component = updatedComponents[i];
            let manager = updatedManagers[i];
            manager.didUpdate(component);
        }
        let destructors = this.destructors;

        for (let i = 0; i < destructors.length; i++) {
            destructors[i].destroy();
        }
        let scheduledInstallManagers = this.scheduledInstallManagers,
            scheduledInstallModifiers = this.scheduledInstallModifiers;

        for (let i = 0; i < scheduledInstallManagers.length; i++) {
            let manager = scheduledInstallManagers[i];
            let modifier = scheduledInstallModifiers[i];
            manager.install(modifier);
        }
        let scheduledUpdateModifierManagers = this.scheduledUpdateModifierManagers,
            scheduledUpdateModifiers = this.scheduledUpdateModifiers;

        for (let i = 0; i < scheduledUpdateModifierManagers.length; i++) {
            let manager = scheduledUpdateModifierManagers[i];
            let modifier = scheduledUpdateModifiers[i];
            manager.update(modifier);
        }
    }
}
class Environment {
    constructor({ appendOperations, updateOperations }) {
        this._transaction = null;
        this.appendOperations = appendOperations;
        this.updateOperations = updateOperations;
    }
    toConditionalReference(reference) {
        return new ConditionalReference$1(reference);
    }
    getAppendOperations() {
        return this.appendOperations;
    }
    getDOM() {
        return this.updateOperations;
    }
    getIdentity(object) {
        return ensureGuid(object) + '';
    }
    begin() {
        false && debugAssert(!this._transaction, 'A glimmer transaction was begun, but one already exists. You may have a nested transaction, possibly caused by an earlier runtime exception while rendering. Please check your console for the stack trace of any prior exceptions.');

        this._transaction = new Transaction();
    }
    get transaction() {
        return this._transaction;
    }
    didCreate(component, manager) {
        this.transaction.didCreate(component, manager);
    }
    didUpdate(component, manager) {
        this.transaction.didUpdate(component, manager);
    }
    scheduleInstallModifier(modifier, manager) {
        this.transaction.scheduleInstallModifier(modifier, manager);
    }
    scheduleUpdateModifier(modifier, manager) {
        this.transaction.scheduleUpdateModifier(modifier, manager);
    }
    didDestroy(d) {
        this.transaction.didDestroy(d);
    }
    commit() {
        let transaction = this.transaction;
        this._transaction = null;
        transaction.commit();
    }
    attributeFor(element, attr, _isTrusting, _namespace = null) {
        return defaultDynamicAttributes(element, attr);
    }
}

class LowLevelVM {
    constructor(stack, heap, program, externs, pc = -1, ra = -1) {
        this.stack = stack;
        this.heap = heap;
        this.program = program;
        this.externs = externs;
        this.pc = pc;
        this.ra = ra;
        this.currentOpSize = 0;
    }
    // Start a new frame and save $ra and $fp on the stack
    pushFrame() {
        this.stack.pushSmi(this.ra);
        this.stack.pushSmi(this.stack.fp);
        this.stack.fp = this.stack.sp - 1;
    }
    // Restore $ra, $sp and $fp
    popFrame() {
        this.stack.sp = this.stack.fp - 1;
        this.ra = this.stack.getSmi(0);
        this.stack.fp = this.stack.getSmi(1);
    }
    // Jump to an address in `program`
    goto(offset) {
        let addr = this.pc + offset - this.currentOpSize;
        this.pc = addr;
    }
    // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
    call(handle) {
        this.ra = this.pc;
        this.pc = this.heap.getaddr(handle);
    }
    // Put a specific `program` address in $ra
    returnTo(offset) {
        let addr = this.pc + offset - this.currentOpSize;
        this.ra = addr;
    }
    // Return to the `program` address stored in $ra
    return() {
        this.pc = this.ra;
    }
    nextStatement() {
        let pc = this.pc,
            program = this.program;

        if (pc === -1) {
            return null;
        }
        // We have to save off the current operations size so that
        // when we do a jump we can calculate the correct offset
        // to where we are going. We can't simply ask for the size
        // in a jump because we have have already incremented the
        // program counter to the next instruction prior to executing.

        var _program$opcode = this.program.opcode(pc);

        let size = _program$opcode.size;

        let operationSize = this.currentOpSize = size;
        this.pc += operationSize;
        return program.opcode(pc);
    }
    evaluateOuter(opcode, vm) {
        {
            this.evaluateInner(opcode, vm);
        }
    }
    evaluateInner(opcode, vm) {
        if (opcode.isMachine) {
            this.evaluateMachine(opcode);
        } else {
            this.evaluateSyscall(opcode, vm);
        }
    }
    evaluateMachine(opcode) {
        switch (opcode.type) {
            case 47 /* PushFrame */:
                return this.pushFrame();
            case 48 /* PopFrame */:
                return this.popFrame();
            case 42 /* InvokeStatic */:
                return this.call(opcode.op1);
            case 41 /* InvokeVirtual */:
                return this.call(this.stack.popSmi());
            case 44 /* Jump */:
                return this.goto(opcode.op1);
            case 20 /* Return */:
                return this.return();
            case 21 /* ReturnTo */:
                return this.returnTo(opcode.op1);
        }
    }
    evaluateSyscall(opcode, vm) {
        APPEND_OPCODES.evaluate(vm, opcode, opcode.type);
    }
}

class DynamicContentBase {
    constructor(trusting) {
        this.trusting = trusting;
    }
    retry(env, value) {
        let bounds$$1 = this.bounds;

        let parentElement = bounds$$1.parentElement();
        let nextSibling = clear(bounds$$1);
        let stack = NewElementBuilder.forInitialRender(env, { element: parentElement, nextSibling });
        if (this.trusting) {
            return stack.__appendTrustingDynamicContent(value);
        } else {
            return stack.__appendCautiousDynamicContent(value);
        }
    }
}
class DynamicContentWrapper {
    constructor(inner) {
        this.inner = inner;
        this.bounds = inner.bounds;
    }
    parentElement() {
        return this.bounds.parentElement();
    }
    firstNode() {
        return this.bounds.firstNode();
    }
    lastNode() {
        return this.bounds.lastNode();
    }
    update(env, value) {
        let inner = this.inner = this.inner.update(env, value);
        this.bounds = inner.bounds;
        return this;
    }
}

class DynamicTextContent extends DynamicContentBase {
    constructor(bounds, lastValue, trusted) {
        super(trusted);
        this.bounds = bounds;
        this.lastValue = lastValue;
    }
    update(env, value) {
        let lastValue = this.lastValue;

        if (value === lastValue) return this;
        if (isNode(value) || isSafeString(value)) return this.retry(env, value);
        let normalized;
        if (isEmpty(value)) {
            normalized = '';
        } else if (isString(value)) {
            normalized = value;
        } else {
            normalized = String(value);
        }
        if (normalized !== lastValue) {
            let textNode = this.bounds.firstNode();
            textNode.nodeValue = this.lastValue = normalized;
        }
        return this;
    }
}

class DynamicNodeContent extends DynamicContentBase {
    constructor(bounds, lastValue, trusting) {
        super(trusting);
        this.bounds = bounds;
        this.lastValue = lastValue;
    }
    update(env, value) {
        let lastValue = this.lastValue;

        if (value === lastValue) return this;
        return this.retry(env, value);
    }
}

class DynamicHTMLContent extends DynamicContentBase {
    constructor(bounds, lastValue, trusted) {
        super(trusted);
        this.bounds = bounds;
        this.lastValue = lastValue;
    }
    update(env, value) {
        let lastValue = this.lastValue;

        if (value === lastValue) return this;
        if (isSafeString(value) && value.toHTML() === lastValue.toHTML()) {
            this.lastValue = value;
            return this;
        }
        return this.retry(env, value);
    }
}
class DynamicTrustedHTMLContent extends DynamicContentBase {
    constructor(bounds, lastValue, trusted) {
        super(trusted);
        this.bounds = bounds;
        this.lastValue = lastValue;
    }
    update(env, value) {
        let lastValue = this.lastValue;

        if (value === lastValue) return this;
        let newValue = normalizeTrustedValue(value);
        if (newValue === lastValue) return this;
        return this.retry(env, value);
    }
}

class First {
    constructor(node) {
        this.node = node;
    }
    firstNode() {
        return this.node;
    }
}
class Last {
    constructor(node) {
        this.node = node;
    }
    lastNode() {
        return this.node;
    }
}

class NewElementBuilder {
    constructor(env, parentNode, nextSibling) {
        this.constructing = null;
        this.operations = null;
        this.cursorStack = new Stack();
        this.blockStack = new Stack();
        this.pushElement(parentNode, nextSibling);
        this.env = env;
        this.dom = env.getAppendOperations();
        this.updateOperations = env.getDOM();
    }
    static forInitialRender(env, cursor) {
        let builder = new this(env, cursor.element, cursor.nextSibling);
        builder.pushSimpleBlock();
        return builder;
    }
    static resume(env, tracker, nextSibling) {
        let parentNode = tracker.parentElement();
        let stack = new this(env, parentNode, nextSibling);
        stack.pushSimpleBlock();
        stack.pushBlockTracker(tracker);
        return stack;
    }
    get element() {
        return this.cursorStack.current.element;
    }
    get nextSibling() {
        return this.cursorStack.current.nextSibling;
    }
    expectConstructing(method) {
        return this.constructing;
    }
    block() {
        return this.blockStack.current;
    }
    popElement() {
        this.cursorStack.pop();
        this.cursorStack.current;
    }
    pushSimpleBlock() {
        return this.pushBlockTracker(new SimpleBlockTracker(this.element));
    }
    pushUpdatableBlock() {
        return this.pushBlockTracker(new UpdatableBlockTracker(this.element));
    }
    pushBlockList(list) {
        return this.pushBlockTracker(new BlockListTracker(this.element, list));
    }
    pushBlockTracker(tracker, isRemote = false) {
        let current = this.blockStack.current;
        if (current !== null) {
            current.newDestroyable(tracker);
            if (!isRemote) {
                current.didAppendBounds(tracker);
            }
        }
        this.__openBlock();
        this.blockStack.push(tracker);
        return tracker;
    }
    popBlock() {
        this.block().finalize(this);
        this.__closeBlock();
        return this.blockStack.pop();
    }
    __openBlock() {}
    __closeBlock() {}
    // todo return seems unused
    openElement(tag) {
        let element = this.__openElement(tag);
        this.constructing = element;
        return element;
    }
    __openElement(tag) {
        return this.dom.createElement(tag, this.element);
    }
    flushElement() {
        let parent = this.element;
        let element = this.constructing;
        this.__flushElement(parent, element);
        this.constructing = null;
        this.operations = null;
        this.pushElement(element, null);
        this.didOpenElement(element);
    }
    __flushElement(parent, constructing) {
        this.dom.insertBefore(parent, constructing, this.nextSibling);
    }
    closeElement() {
        this.willCloseElement();
        this.popElement();
    }
    pushRemoteElement(element, guid, nextSibling = null) {
        this.__pushRemoteElement(element, guid, nextSibling);
    }
    __pushRemoteElement(element, _guid, nextSibling) {
        this.pushElement(element, nextSibling);
        let tracker = new RemoteBlockTracker(element);
        this.pushBlockTracker(tracker, true);
    }
    popRemoteElement() {
        this.popBlock();
        this.popElement();
    }
    pushElement(element, nextSibling) {
        this.cursorStack.push(new Cursor(element, nextSibling));
    }
    didAddDestroyable(d) {
        this.block().newDestroyable(d);
    }
    didAppendBounds(bounds$$1) {
        this.block().didAppendBounds(bounds$$1);
        return bounds$$1;
    }
    didAppendNode(node) {
        this.block().didAppendNode(node);
        return node;
    }
    didOpenElement(element) {
        this.block().openElement(element);
        return element;
    }
    willCloseElement() {
        this.block().closeElement();
    }
    appendText(string) {
        return this.didAppendNode(this.__appendText(string));
    }
    __appendText(text) {
        let dom = this.dom,
            element = this.element,
            nextSibling = this.nextSibling;

        let node = dom.createTextNode(text);
        dom.insertBefore(element, node, nextSibling);
        return node;
    }
    __appendNode(node) {
        this.dom.insertBefore(this.element, node, this.nextSibling);
        return node;
    }
    __appendFragment(fragment) {
        let first = fragment.firstChild;
        if (first) {
            let ret = bounds(this.element, first, fragment.lastChild);
            this.dom.insertBefore(this.element, fragment, this.nextSibling);
            return ret;
        } else {
            return single(this.element, this.__appendComment(''));
        }
    }
    __appendHTML(html) {
        return this.dom.insertHTMLBefore(this.element, this.nextSibling, html);
    }
    appendTrustingDynamicContent(value) {
        let wrapper = new DynamicContentWrapper(this.__appendTrustingDynamicContent(value));
        this.didAppendBounds(wrapper);
        return wrapper;
    }
    __appendTrustingDynamicContent(value) {
        if (isString(value)) {
            return this.trustedContent(value);
        } else if (isEmpty(value)) {
            return this.trustedContent('');
        } else if (isSafeString(value)) {
            return this.trustedContent(value.toHTML());
        }
        if (isFragment(value)) {
            let bounds$$1 = this.__appendFragment(value);
            return new DynamicNodeContent(bounds$$1, value, true);
        } else if (isNode(value)) {
            let node = this.__appendNode(value);
            return new DynamicNodeContent(single(this.element, node), node, true);
        }
        return this.trustedContent(String(value));
    }
    appendCautiousDynamicContent(value) {
        let wrapper = new DynamicContentWrapper(this.__appendCautiousDynamicContent(value));
        this.didAppendBounds(wrapper.bounds);
        return wrapper;
    }
    __appendCautiousDynamicContent(value) {
        if (isString(value)) {
            return this.untrustedContent(value);
        } else if (isEmpty(value)) {
            return this.untrustedContent('');
        } else if (isFragment(value)) {
            let bounds$$1 = this.__appendFragment(value);
            return new DynamicNodeContent(bounds$$1, value, false);
        } else if (isNode(value)) {
            let node = this.__appendNode(value);
            return new DynamicNodeContent(single(this.element, node), node, false);
        } else if (isSafeString(value)) {
            let normalized = value.toHTML();
            let bounds$$1 = this.__appendHTML(normalized);
            // let bounds = this.dom.insertHTMLBefore(this.element, this.nextSibling, normalized);
            return new DynamicHTMLContent(bounds$$1, value, false);
        }
        return this.untrustedContent(String(value));
    }
    trustedContent(value) {
        let bounds$$1 = this.__appendHTML(value);
        return new DynamicTrustedHTMLContent(bounds$$1, value, true);
    }
    untrustedContent(value) {
        let textNode = this.__appendText(value);
        let bounds$$1 = single(this.element, textNode);
        return new DynamicTextContent(bounds$$1, value, false);
    }
    appendComment(string) {
        return this.didAppendNode(this.__appendComment(string));
    }
    __appendComment(string) {
        let dom = this.dom,
            element = this.element,
            nextSibling = this.nextSibling;

        let node = dom.createComment(string);
        dom.insertBefore(element, node, nextSibling);
        return node;
    }
    __setAttribute(name, value, namespace) {
        this.dom.setAttribute(this.constructing, name, value, namespace);
    }
    __setProperty(name, value) {
        this.constructing[name] = value;
    }
    setStaticAttribute(name, value, namespace) {
        this.__setAttribute(name, value, namespace);
    }
    setDynamicAttribute(name, value, trusting, namespace) {
        let element = this.constructing;
        let DynamicAttribute = this.env.attributeFor(element, name, trusting, namespace);
        let attribute = new DynamicAttribute({ element, name, namespace: namespace || null });
        attribute.set(this, value, this.env);
        return attribute;
    }
}
class SimpleBlockTracker {
    constructor(parent) {
        this.parent = parent;
        this.first = null;
        this.last = null;
        this.destroyables = null;
        this.nesting = 0;
    }
    destroy() {
        let destroyables = this.destroyables;

        if (destroyables && destroyables.length) {
            for (let i = 0; i < destroyables.length; i++) {
                destroyables[i].destroy();
            }
        }
    }
    parentElement() {
        return this.parent;
    }
    firstNode() {
        return this.first && this.first.firstNode();
    }
    lastNode() {
        return this.last && this.last.lastNode();
    }
    openElement(element) {
        this.didAppendNode(element);
        this.nesting++;
    }
    closeElement() {
        this.nesting--;
    }
    didAppendNode(node) {
        if (this.nesting !== 0) return;
        if (!this.first) {
            this.first = new First(node);
        }
        this.last = new Last(node);
    }
    didAppendBounds(bounds$$1) {
        if (this.nesting !== 0) return;
        if (!this.first) {
            this.first = bounds$$1;
        }
        this.last = bounds$$1;
    }
    newDestroyable(d) {
        this.destroyables = this.destroyables || [];
        this.destroyables.push(d);
    }
    finalize(stack) {
        if (!this.first) {
            stack.appendComment('');
        }
    }
}
class RemoteBlockTracker extends SimpleBlockTracker {
    destroy() {
        super.destroy();
        clear(this);
    }
}
class UpdatableBlockTracker extends SimpleBlockTracker {
    reset(env) {
        let destroyables = this.destroyables;

        if (destroyables && destroyables.length) {
            for (let i = 0; i < destroyables.length; i++) {
                env.didDestroy(destroyables[i]);
            }
        }
        let nextSibling = clear(this);
        this.first = null;
        this.last = null;
        this.destroyables = null;
        this.nesting = 0;
        return nextSibling;
    }
}
class BlockListTracker {
    constructor(parent, boundList) {
        this.parent = parent;
        this.boundList = boundList;
        this.parent = parent;
        this.boundList = boundList;
    }
    destroy() {
        this.boundList.forEachNode(node => node.destroy());
    }
    parentElement() {
        return this.parent;
    }
    firstNode() {
        let head = this.boundList.head();
        return head && head.firstNode();
    }
    lastNode() {
        let tail = this.boundList.tail();
        return tail && tail.lastNode();
    }
    openElement(_element) {
        false && debugAssert(false, 'Cannot openElement directly inside a block list');
    }
    closeElement() {
        false && debugAssert(false, 'Cannot closeElement directly inside a block list');
    }
    didAppendNode(_node) {
        false && debugAssert(false, 'Cannot create a new node directly inside a block list');
    }
    didAppendBounds(_bounds) {}
    newDestroyable(_d) {}
    finalize(_stack) {}
}
function clientBuilder(env, cursor) {
    return NewElementBuilder.forInitialRender(env, cursor);
}

class Stack$1 {
    constructor(vec = []) {
        this.vec = vec;
    }
    clone() {
        return new Stack$1(this.vec.slice());
    }
    sliceFrom(start) {
        return new Stack$1(this.vec.slice(start));
    }
    slice(start, end) {
        return new Stack$1(this.vec.slice(start, end));
    }
    copy(from, to) {
        this.vec[to] = this.vec[from];
    }
    // TODO: how to model u64 argument?
    writeRaw(pos, value) {
        // TODO: Grow?
        this.vec[pos] = value;
    }
    writeSmi(pos, value) {
        this.vec[pos] = encodeSmi$1(value);
    }
    // TODO: partially decoded enum?
    getRaw(pos) {
        return this.vec[pos];
    }
    getSmi(pos) {
        return decodeSmi$1(this.vec[pos]);
    }
    reset() {
        this.vec.length = 0;
    }
    len() {
        return this.vec.length;
    }
}
function decodeSmi$1(smi) {
    switch (smi & 0b111) {
        case 0 /* NUMBER */:
            return smi >> 3;
        case 4 /* NEGATIVE */:
            return -(smi >> 3);
        default:
            throw new Error('unreachable');
    }
}
function encodeSmi$1(primitive) {
    if (primitive < 0) {
        return Math.abs(primitive) << 3 | 4 /* NEGATIVE */;
    } else {
        return primitive << 3 | 0 /* NUMBER */;
    }
}

const HI = 0x80000000;
const MASK = 0x7FFFFFFF;
class InnerStack {
    constructor(inner = new Stack$1(), js = []) {
        this.inner = inner;
        this.js = js;
    }
    slice(start, end) {
        let inner;
        if (typeof start === 'number' && typeof end === 'number') {
            inner = this.inner.slice(start, end);
        } else if (typeof start === 'number' && end === undefined) {
            inner = this.inner.sliceFrom(start);
        } else {
            inner = this.inner.clone();
        }
        return new InnerStack(inner, this.js.slice(start, end));
    }
    sliceInner(start, end) {
        let out = [];
        for (let i = start; i < end; i++) {
            out.push(this.get(i));
        }
        return out;
    }
    copy(from, to) {
        this.inner.copy(from, to);
    }
    write(pos, value) {
        if (isImmediate(value)) {
            this.inner.writeRaw(pos, encodeImmediate(value));
        } else {
            let idx = this.js.length;
            this.js.push(value);
            this.inner.writeRaw(pos, idx | HI);
        }
    }
    writeSmi(pos, value) {
        this.inner.writeSmi(pos, value);
    }
    writeImmediate(pos, value) {
        this.inner.writeRaw(pos, value);
    }
    get(pos) {
        let value = this.inner.getRaw(pos);
        if (value & HI) {
            return this.js[value & MASK];
        } else {
            return decodeImmediate(value);
        }
    }
    getSmi(pos) {
        return this.inner.getSmi(pos);
    }
    reset() {
        this.inner.reset();
    }
    get length() {
        return this.inner.len();
    }
}
class EvaluationStack {
    constructor(stack, fp, sp) {
        this.stack = stack;
        this.fp = fp;
        this.sp = sp;
        
    }
    static empty() {
        return new this(new InnerStack(), 0, -1);
    }
    static restore(snapshot) {
        let stack = new InnerStack();
        for (let i = 0; i < snapshot.length; i++) {
            stack.write(i, snapshot[i]);
        }
        return new this(stack, 0, snapshot.length - 1);
    }
    push(value) {
        this.stack.write(++this.sp, value);
    }
    pushSmi(value) {
        this.stack.writeSmi(++this.sp, value);
    }
    pushImmediate(value) {
        this.stack.writeImmediate(++this.sp, encodeImmediate(value));
    }
    pushEncodedImmediate(value) {
        this.stack.writeImmediate(++this.sp, value);
    }
    pushNull() {
        this.stack.writeImmediate(++this.sp, 19 /* Null */);
    }
    dup(position = this.sp) {
        this.stack.copy(position, ++this.sp);
    }
    copy(from, to) {
        this.stack.copy(from, to);
    }
    pop(n = 1) {
        let top = this.stack.get(this.sp);
        this.sp -= n;
        return top;
    }
    popSmi() {
        return this.stack.getSmi(this.sp--);
    }
    peek(offset = 0) {
        return this.stack.get(this.sp - offset);
    }
    peekSmi(offset = 0) {
        return this.stack.getSmi(this.sp - offset);
    }
    get(offset, base = this.fp) {
        return this.stack.get(base + offset);
    }
    getSmi(offset, base = this.fp) {
        return this.stack.getSmi(base + offset);
    }
    set(value, offset, base = this.fp) {
        this.stack.write(base + offset, value);
    }
    slice(start, end) {
        return this.stack.slice(start, end);
    }
    sliceArray(start, end) {
        return this.stack.sliceInner(start, end);
    }
    capture(items) {
        let end = this.sp + 1;
        let start = end - items;
        return this.stack.sliceInner(start, end);
    }
    reset() {
        this.stack.reset();
    }
    toArray() {
        return this.stack.sliceInner(this.fp, this.sp + 1);
    }
}
function isImmediate(value) {
    let type = typeof value;
    if (value === null || value === undefined) return true;
    switch (type) {
        case 'boolean':
        case 'undefined':
            return true;
        case 'number':
            // not an integer
            if (value % 1 !== 0) return false;
            let abs = Math.abs(value);
            // too big
            if (abs & HI) return false;
            return true;
        default:
            return false;
    }
}
function encodeSmi(primitive) {
    if (primitive < 0) {
        return Math.abs(primitive) << 3 | 4 /* NEGATIVE */;
    } else {
        return primitive << 3 | 0 /* NUMBER */;
    }
}
function encodeImmediate(primitive) {
    switch (typeof primitive) {
        case 'number':
            return encodeSmi(primitive);
        case 'boolean':
            return primitive ? 11 /* True */ : 3 /* False */;
        case 'object':
            // assume null
            return 19 /* Null */;
        case 'undefined':
            return 27 /* Undef */;
        default:
            throw unreachable();
    }
}
function decodeSmi(smi) {
    switch (smi & 0b111) {
        case 0 /* NUMBER */:
            return smi >> 3;
        case 4 /* NEGATIVE */:
            return -(smi >> 3);
        default:
            throw unreachable();
    }
}
function decodeImmediate(immediate) {
    switch (immediate) {
        case 3 /* False */:
            return false;
        case 11 /* True */:
            return true;
        case 19 /* Null */:
            return null;
        case 27 /* Undef */:
            return undefined;
        default:
            return decodeSmi(immediate);
    }
}

class UpdatingVM {
    constructor(env, program, { alwaysRevalidate = false }) {
        this.frameStack = new Stack();
        this.env = env;
        this.constants = program.constants;
        this.dom = env.getDOM();
        this.alwaysRevalidate = alwaysRevalidate;
    }
    execute(opcodes, handler) {
        let frameStack = this.frameStack;

        this.try(opcodes, handler);
        while (true) {
            if (frameStack.isEmpty()) break;
            let opcode = this.frame.nextStatement();
            if (opcode === null) {
                this.frameStack.pop();
                continue;
            }
            opcode.evaluate(this);
        }
    }
    get frame() {
        return this.frameStack.current;
    }
    goto(op) {
        this.frame.goto(op);
    }
    try(ops, handler) {
        this.frameStack.push(new UpdatingVMFrame(ops, handler));
    }
    throw() {
        this.frame.handleException();
        this.frameStack.pop();
    }
}
class BlockOpcode extends UpdatingOpcode {
    constructor(start, state, bounds$$1, children) {
        super();
        this.start = start;
        this.state = state;
        this.type = "block";
        this.next = null;
        this.prev = null;
        this.children = children;
        this.bounds = bounds$$1;
    }
    parentElement() {
        return this.bounds.parentElement();
    }
    firstNode() {
        return this.bounds.firstNode();
    }
    lastNode() {
        return this.bounds.lastNode();
    }
    evaluate(vm) {
        vm.try(this.children, null);
    }
    destroy() {
        this.bounds.destroy();
    }
    didDestroy() {
        this.state.env.didDestroy(this.bounds);
    }
}
class TryOpcode extends BlockOpcode {
    constructor(start, state, bounds$$1, children) {
        super(start, state, bounds$$1, children);
        this.type = "try";
        this.tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
    }
    didInitializeChildren() {
        this._tag.inner.update(combineSlice(this.children));
    }
    evaluate(vm) {
        vm.try(this.children, this);
    }
    handleException() {
        let state = this.state,
            bounds$$1 = this.bounds,
            children = this.children,
            start = this.start,
            prev = this.prev,
            next = this.next;

        children.clear();
        let elementStack = NewElementBuilder.resume(state.env, bounds$$1, bounds$$1.reset(state.env));
        let vm = VM.resume(state, elementStack);
        let updating = new LinkedList();
        vm.execute(start, vm => {
            vm.stack = EvaluationStack.restore(state.stack);
            vm.updatingOpcodeStack.push(updating);
            vm.updateWith(this);
            vm.updatingOpcodeStack.push(children);
        });
        this.prev = prev;
        this.next = next;
    }
}
class ListRevalidationDelegate {
    constructor(opcode, marker) {
        this.opcode = opcode;
        this.marker = marker;
        this.didInsert = false;
        this.didDelete = false;
        this.map = opcode.map;
        this.updating = opcode['children'];
    }
    insert(key, item, memo, before) {
        let map$$1 = this.map,
            opcode = this.opcode,
            updating = this.updating;

        let nextSibling = null;
        let reference = null;
        if (before) {
            reference = map$$1[before];
            nextSibling = reference['bounds'].firstNode();
        } else {
            nextSibling = this.marker;
        }
        let vm = opcode.vmForInsertion(nextSibling);
        let tryOpcode = null;
        let start = opcode.start;

        vm.execute(start, vm => {
            map$$1[key] = tryOpcode = vm.iterate(memo, item);
            vm.updatingOpcodeStack.push(new LinkedList());
            vm.updateWith(tryOpcode);
            vm.updatingOpcodeStack.push(tryOpcode.children);
        });
        updating.insertBefore(tryOpcode, reference);
        this.didInsert = true;
    }
    retain(_key, _item, _memo) {}
    move(key, _item, _memo, before) {
        let map$$1 = this.map,
            updating = this.updating;

        let entry = map$$1[key];
        let reference = map$$1[before] || null;
        if (before) {
            move(entry, reference.firstNode());
        } else {
            move(entry, this.marker);
        }
        updating.remove(entry);
        updating.insertBefore(entry, reference);
    }
    delete(key) {
        let map$$1 = this.map;

        let opcode = map$$1[key];
        opcode.didDestroy();
        clear(opcode);
        this.updating.remove(opcode);
        delete map$$1[key];
        this.didDelete = true;
    }
    done() {
        this.opcode.didInitializeChildren(this.didInsert || this.didDelete);
    }
}
class ListBlockOpcode extends BlockOpcode {
    constructor(start, state, bounds$$1, children, artifacts) {
        super(start, state, bounds$$1, children);
        this.type = "list-block";
        this.map = dict();
        this.lastIterated = INITIAL;
        this.artifacts = artifacts;
        let _tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
        this.tag = combine([artifacts.tag, _tag]);
    }
    didInitializeChildren(listDidChange = true) {
        this.lastIterated = this.artifacts.tag.value();
        if (listDidChange) {
            this._tag.inner.update(combineSlice(this.children));
        }
    }
    evaluate(vm) {
        let artifacts = this.artifacts,
            lastIterated = this.lastIterated;

        if (!artifacts.tag.validate(lastIterated)) {
            let bounds$$1 = this.bounds;
            let dom = vm.dom;

            let marker = dom.createComment('');
            dom.insertAfter(bounds$$1.parentElement(), marker, bounds$$1.lastNode());
            let target = new ListRevalidationDelegate(this, marker);
            let synchronizer = new IteratorSynchronizer({ target, artifacts });
            synchronizer.sync();
            this.parentElement().removeChild(marker);
        }
        // Run now-updated updating opcodes
        super.evaluate(vm);
    }
    vmForInsertion(nextSibling) {
        let bounds$$1 = this.bounds,
            state = this.state;

        let elementStack = NewElementBuilder.forInitialRender(state.env, { element: bounds$$1.parentElement(), nextSibling });
        return VM.resume(state, elementStack);
    }
}
class UpdatingVMFrame {
    constructor(ops, exceptionHandler) {
        this.ops = ops;
        this.exceptionHandler = exceptionHandler;
        this.current = ops.head();
    }
    goto(op) {
        this.current = op;
    }
    nextStatement() {
        let current = this.current,
            ops = this.ops;

        if (current) this.current = ops.nextNode(current);
        return current;
    }
    handleException() {
        if (this.exceptionHandler) {
            this.exceptionHandler.handleException();
        }
    }
}

class RenderResult {
    constructor(env, program, updating, bounds$$1) {
        this.env = env;
        this.program = program;
        this.updating = updating;
        this.bounds = bounds$$1;
    }
    rerender({ alwaysRevalidate = false } = { alwaysRevalidate: false }) {
        let env = this.env,
            program = this.program,
            updating = this.updating;

        let vm = new UpdatingVM(env, program, { alwaysRevalidate });
        vm.execute(updating, this);
    }
    parentElement() {
        return this.bounds.parentElement();
    }
    firstNode() {
        return this.bounds.firstNode();
    }
    lastNode() {
        return this.bounds.lastNode();
    }
    handleException() {
        throw "this should never happen";
    }
    destroy() {
        this.bounds.destroy();
        clear(this.bounds);
    }
}

class VM {
    constructor(program, env, scope, dynamicScope, elementStack) {
        this.program = program;
        this.env = env;
        this.elementStack = elementStack;
        this.dynamicScopeStack = new Stack();
        this.scopeStack = new Stack();
        this.updatingOpcodeStack = new Stack();
        this.cacheGroups = new Stack();
        this.listBlockStack = new Stack();
        this.s0 = null;
        this.s1 = null;
        this.t0 = null;
        this.t1 = null;
        this.v0 = null;
        this.env = env;
        this.heap = program.heap;
        this.constants = program.constants;
        this.elementStack = elementStack;
        this.scopeStack.push(scope);
        this.dynamicScopeStack.push(dynamicScope);
        this.inner = new LowLevelVM(EvaluationStack.empty(), this.heap, program, {
            debugBefore: opcode => {
                return APPEND_OPCODES.debugBefore(this, opcode, opcode.type);
            },
            debugAfter: (opcode, state) => {
                APPEND_OPCODES.debugAfter(this, opcode, opcode.type, state);
            }
        });
    }
    get stack() {
        return this.inner.stack;
    }
    set stack(value) {
        this.inner.stack = value;
    }
    /* Registers */
    set currentOpSize(value) {
        this.inner.currentOpSize = value;
    }
    get currentOpSize() {
        return this.inner.currentOpSize;
    }
    get pc() {
        return this.inner.pc;
    }
    set pc(value) {
        false && debugAssert(typeof value === 'number' && value >= -1, `invalid pc: ${value}`);

        this.inner.pc = value;
    }
    get ra() {
        return this.inner.ra;
    }
    set ra(value) {
        this.inner.ra = value;
    }
    get fp() {
        return this.stack.fp;
    }
    set fp(fp) {
        this.stack.fp = fp;
    }
    get sp() {
        return this.stack.sp;
    }
    set sp(sp) {
        this.stack.sp = sp;
    }
    // Fetch a value from a register onto the stack
    fetch(register) {
        this.stack.push(this[Register[register]]);
    }
    // Load a value from the stack into a register
    load(register) {
        this[Register[register]] = this.stack.pop();
    }
    // Fetch a value from a register
    fetchValue(register) {
        return this[Register[register]];
    }
    // Load a value into a register
    loadValue(register, value) {
        this[Register[register]] = value;
    }
    /**
     * Migrated to Inner
     */
    // Start a new frame and save $ra and $fp on the stack
    pushFrame() {
        this.inner.pushFrame();
    }
    // Restore $ra, $sp and $fp
    popFrame() {
        this.inner.popFrame();
    }
    // Jump to an address in `program`
    goto(offset) {
        this.inner.goto(offset);
    }
    // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
    call(handle) {
        this.inner.call(handle);
    }
    // Put a specific `program` address in $ra
    returnTo(offset) {
        this.inner.returnTo(offset);
    }
    // Return to the `program` address stored in $ra
    return() {
        this.inner.return();
    }
    /**
     * End of migrated.
     */
    static initial(program, env, self, args, dynamicScope, elementStack, handle) {
        let scopeSize = program.heap.scopesizeof(handle);
        let scope = Scope.root(self, scopeSize);
        if (args) {}
        let vm = new VM(program, env, scope, dynamicScope, elementStack);
        vm.pc = vm.heap.getaddr(handle);
        vm.updatingOpcodeStack.push(new LinkedList());
        return vm;
    }
    static empty(program, env, elementStack) {
        let dynamicScope = {
            get() {
                return UNDEFINED_REFERENCE;
            },
            set() {
                return UNDEFINED_REFERENCE;
            },
            child() {
                return dynamicScope;
            }
        };
        let vm = new VM(program, env, Scope.root(UNDEFINED_REFERENCE, 0), dynamicScope, elementStack);
        vm.updatingOpcodeStack.push(new LinkedList());
        return vm;
    }
    static resume({ program, env, scope, dynamicScope }, stack) {
        return new VM(program, env, scope, dynamicScope, stack);
    }
    capture(args) {
        return {
            env: this.env,
            program: this.program,
            dynamicScope: this.dynamicScope(),
            scope: this.scope(),
            stack: this.stack.capture(args)
        };
    }
    beginCacheGroup() {
        this.cacheGroups.push(this.updating().tail());
    }
    commitCacheGroup() {
        //        JumpIfNotModified(END)
        //        (head)
        //        (....)
        //        (tail)
        //        DidModify
        // END:   Noop
        let END = new LabelOpcode("END");
        let opcodes = this.updating();
        let marker = this.cacheGroups.pop();
        let head = marker ? opcodes.nextNode(marker) : opcodes.head();
        let tail = opcodes.tail();
        let tag = combineSlice(new ListSlice(head, tail));
        let guard = new JumpIfNotModifiedOpcode(tag, END);
        opcodes.insertBefore(guard, head);
        opcodes.append(new DidModifyOpcode(guard));
        opcodes.append(END);
    }
    enter(args) {
        let updating = new LinkedList();
        let state = this.capture(args);
        let tracker = this.elements().pushUpdatableBlock();
        let tryOpcode = new TryOpcode(this.heap.gethandle(this.pc), state, tracker, updating);
        this.didEnter(tryOpcode);
    }
    iterate(memo, value) {
        let stack = this.stack;
        stack.push(value);
        stack.push(memo);
        let state = this.capture(2);
        let tracker = this.elements().pushUpdatableBlock();
        // let ip = this.ip;
        // this.ip = end + 4;
        // this.frames.push(ip);
        return new TryOpcode(this.heap.gethandle(this.pc), state, tracker, new LinkedList());
    }
    enterItem(key, opcode) {
        this.listBlock().map[key] = opcode;
        this.didEnter(opcode);
    }
    enterList(relativeStart) {
        let updating = new LinkedList();
        let state = this.capture(0);
        let tracker = this.elements().pushBlockList(updating);
        let artifacts = this.stack.peek().artifacts;
        let addr = this.pc + relativeStart - this.currentOpSize;
        let start = this.heap.gethandle(addr);
        let opcode = new ListBlockOpcode(start, state, tracker, updating, artifacts);
        this.listBlockStack.push(opcode);
        this.didEnter(opcode);
    }
    didEnter(opcode) {
        this.updateWith(opcode);
        this.updatingOpcodeStack.push(opcode.children);
    }
    exit() {
        this.elements().popBlock();
        this.updatingOpcodeStack.pop();
        let parent = this.updating().tail();
        parent.didInitializeChildren();
    }
    exitList() {
        this.exit();
        this.listBlockStack.pop();
    }
    updateWith(opcode) {
        this.updating().append(opcode);
    }
    listBlock() {
        return this.listBlockStack.current;
    }
    updating() {
        return this.updatingOpcodeStack.current;
    }
    elements() {
        return this.elementStack;
    }
    scope() {
        return this.scopeStack.current;
    }
    dynamicScope() {
        return this.dynamicScopeStack.current;
    }
    pushChildScope() {
        this.scopeStack.push(this.scope().child());
    }
    pushDynamicScope() {
        let child = this.dynamicScope().child();
        this.dynamicScopeStack.push(child);
        return child;
    }
    pushRootScope(size, bindCaller) {
        let scope = Scope.sized(size);
        if (bindCaller) scope.bindCallerScope(this.scope());
        this.scopeStack.push(scope);
        return scope;
    }
    pushScope(scope) {
        this.scopeStack.push(scope);
    }
    popScope() {
        this.scopeStack.pop();
    }
    popDynamicScope() {
        this.dynamicScopeStack.pop();
    }
    newDestroyable(d) {
        this.elements().didAddDestroyable(d);
    }
    /// SCOPE HELPERS
    getSelf() {
        return this.scope().getSelf();
    }
    referenceForSymbol(symbol) {
        return this.scope().getSymbol(symbol);
    }
    /// EXECUTION
    execute(start, initialize) {
        this.pc = this.heap.getaddr(start);
        if (initialize) initialize(this);
        let result;
        while (true) {
            result = this.next();
            if (result.done) break;
        }
        return result.value;
    }
    next() {
        let env = this.env,
            program = this.program,
            updatingOpcodeStack = this.updatingOpcodeStack,
            elementStack = this.elementStack;

        let opcode = this.inner.nextStatement();
        let result;
        if (opcode !== null) {
            this.inner.evaluateOuter(opcode, this);
            result = { done: false, value: null };
        } else {
            // Unload the stack
            this.stack.reset();
            result = {
                done: true,
                value: new RenderResult(env, program, updatingOpcodeStack.pop(), elementStack.popBlock())
            };
        }
        return result;
    }
    bindDynamicScope(names) {
        let scope = this.dynamicScope();
        for (let i = names.length - 1; i >= 0; i--) {
            let name = this.constants.getString(names[i]);
            scope.set(name, this.stack.pop());
        }
    }
}

class TemplateIterator {
    constructor(vm) {
        this.vm = vm;
    }
    next() {
        return this.vm.next();
    }
}
let clientId = 0;
function templateFactory({ id: templateId, meta, block }) {
    let parsedBlock;
    let id = templateId || `client-${clientId++}`;
    let create = (options, envMeta) => {
        let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
        if (!parsedBlock) {
            parsedBlock = JSON.parse(block);
        }
        return new ScannableTemplate(options, { id, block: parsedBlock, referrer: newMeta });
    };
    return { id, meta, create };
}
class ScannableTemplate {
    constructor(options, parsedLayout) {
        this.options = options;
        this.parsedLayout = parsedLayout;
        this.layout = null;
        this.partial = null;
        let block = parsedLayout.block;

        this.symbols = block.symbols;
        this.hasEval = block.hasEval;
        this.statements = block.statements;
        this.referrer = parsedLayout.referrer;
        this.id = parsedLayout.id || `client-${clientId++}`;
    }
    renderLayout(options) {
        let env = options.env,
            self = options.self,
            dynamicScope = options.dynamicScope;
        var _options$args = options.args;
        let args = _options$args === undefined ? EMPTY_ARGS : _options$args,
            builder = options.builder;

        let layout = this.asLayout();
        let handle = layout.compile();
        let vm = VM.initial(this.options.program, env, self, args, dynamicScope, builder, handle);
        return new TemplateIterator(vm);
    }
    asLayout() {
        if (this.layout) return this.layout;
        return this.layout = compilable(this.parsedLayout, this.options, false);
    }
    asPartial() {
        if (this.partial) return this.partial;
        return this.partial = compilable(this.parsedLayout, this.options, true);
    }
}
function compilable(layout, options, asPartial) {
    let block = layout.block,
        referrer = layout.referrer;
    let hasEval = block.hasEval,
        symbols = block.symbols;

    let compileOptions = assign({}, options, { asPartial, referrer });
    return new CompilableTemplate(block.statements, layout, compileOptions, { referrer, hasEval, symbols });
}

/** @internal */

/** @internal */

function isComment(node) {
    return node.nodeType === 8;
}
function getOpenBlockDepth(node) {
    let boundsDepth = node.nodeValue.match(/^%\+b:(\d+)%$/);
    if (boundsDepth && boundsDepth[1]) {
        return Number(boundsDepth[1]);
    } else {
        return null;
    }
}
function getCloseBlockDepth(node) {
    let boundsDepth = node.nodeValue.match(/^%\-b:(\d+)%$/);
    if (boundsDepth && boundsDepth[1]) {
        return Number(boundsDepth[1]);
    } else {
        return null;
    }
}

/**
 * The base PathReference.
 */
class ComponentPathReference {
    get(key) {
        return PropertyReference.create(this, key);
    }
}
class CachedReference$1 extends ComponentPathReference {
    constructor() {
        super(...arguments);
        this._lastRevision = null;
        this._lastValue = null;
    }
    value() {
        let tag = this.tag,
            _lastRevision = this._lastRevision,
            _lastValue = this._lastValue;

        if (!_lastRevision || !tag.validate(_lastRevision)) {
            _lastValue = this._lastValue = this.compute();
            this._lastRevision = tag.value();
        }
        return _lastValue;
    }
}
class RootReference extends ConstReference {
    constructor() {
        super(...arguments);
        this.children = dict();
    }
    get(propertyKey) {
        let ref = this.children[propertyKey];
        if (!ref) {
            ref = this.children[propertyKey] = new RootPropertyReference(this.inner, propertyKey);
        }
        return ref;
    }
}
class PropertyReference extends CachedReference$1 {
    static create(parentReference, propertyKey) {
        if (isConst(parentReference)) {
            return new RootPropertyReference(parentReference.value(), propertyKey);
        } else {
            return new NestedPropertyReference(parentReference, propertyKey);
        }
    }
    get(key) {
        return new NestedPropertyReference(this, key);
    }
}
class RootPropertyReference extends PropertyReference {
    constructor(parentValue, propertyKey) {
        super();
        this._parentValue = parentValue;
        this._propertyKey = propertyKey;
        this.tag = tagForProperty(parentValue, propertyKey);
    }
    compute() {
        return this._parentValue[this._propertyKey];
    }
}
class NestedPropertyReference extends PropertyReference {
    constructor(parentReference, propertyKey) {
        super();
        let parentReferenceTag = parentReference.tag;
        let parentObjectTag = UpdatableTag.create(CONSTANT_TAG);
        this._parentReference = parentReference;
        this._parentObjectTag = parentObjectTag;
        this._propertyKey = propertyKey;
        this.tag = combine([parentReferenceTag, parentObjectTag]);
    }
    compute() {
        let _parentReference = this._parentReference,
            _parentObjectTag = this._parentObjectTag,
            _propertyKey = this._propertyKey;

        let parentValue = _parentReference.value();
        _parentObjectTag.inner.update(tagForProperty(parentValue, _propertyKey));
        if (typeof parentValue === "string" && _propertyKey === "length") {
            return parentValue.length;
        }
        if (typeof parentValue === "object" && parentValue) {
            return parentValue[_propertyKey];
        } else {
            return undefined;
        }
    }
}
class UpdatableReference extends ComponentPathReference {
    constructor(value) {
        super();
        this.tag = DirtyableTag.create();
        this._value = value;
    }
    value() {
        return this._value;
    }
    update(value) {
        let _value = this._value;

        if (value !== _value) {
            this.tag.inner.dirty();
            this._value = value;
        }
    }
}

class TemplateOnlyComponentDebugReference extends ConstReference {
    constructor(name) {
        super(undefined);
        this.name = name;
    }
    get(propertyKey) {
        throw new Error(`You tried to reference {{${propertyKey}}} from the ${this.name} template, which doesn't have an associated component class. Template-only components can only access args passed to them. Did you mean {{@${propertyKey}}}?`);
    }
}

class ComponentStateBucket {
    constructor(definition, args, owner) {
        let componentFactory = definition.ComponentClass;
        let name = definition.name;
        this.args = args;
        let injections = {
            debugName: name,
            args: this.namedArgsSnapshot()
        };
        setOwner(injections, owner);
        if (componentFactory) {
            this.component = componentFactory.create(injections);
        }
    }
    get tag() {
        return this.args.tag;
    }
    namedArgsSnapshot() {
        return Object.freeze(this.args.named.value());
    }
}
const EMPTY_SELF = new RootReference(null);
/**
 * For performance reasons, we want to avoid instantiating component buckets for
 * components that don't have an associated component class that we would need
 * instantiate and invoke lifecycle hooks on.
 *
 * In development mode, however, we need to track some state about the component
 * in order to produce more useful error messages. This
 * TemplateOnlyComponentDebugBucket is only created in development mode to hold
 * that state.
 */
class TemplateOnlyComponentDebugBucket {
    constructor(definition) {
        this.definition = definition;
    }
}
class ComponentManager {
    static create(options) {
        return new ComponentManager(options);
    }
    constructor(options) {
        this.env = options.env;
    }
    prepareArgs(state, args) {
        return null;
    }
    getCapabilities(state) {
        return state.capabilities;
    }
    getLayout({ name, handle, symbolTable }, resolver) {
        if (handle && symbolTable) {
            return {
                handle,
                symbolTable
            };
        }
        return resolver.compileTemplate(name, handle);
    }
    create(_env, definition, args, _dynamicScope, _caller, _hasDefaultBlock) {
        // In development mode, if a component is template-only, save off state
        // needed for error messages. This will get stripped in production mode and
        // no bucket will be instantiated.
        if (true && !definition.ComponentClass) {
            return new TemplateOnlyComponentDebugBucket(definition);
        }
        // Only create a state bucket if the component is actually stateful. We can
        // skip this for template-only components, which are pure functions.
        if (definition.ComponentClass) {
            let owner = getOwner(this.env);
            return new ComponentStateBucket(definition, args.capture(), owner);
        }
    }
    getSelf(bucket) {
        if (true && bucket instanceof TemplateOnlyComponentDebugBucket) {
            return new TemplateOnlyComponentDebugReference(bucket.definition.name);
        }
        if (bucket) {
            return new RootReference(bucket.component);
        }
        return EMPTY_SELF;
    }
    didCreateElement(bucket, element) {}
    didRenderLayout(bucket, bounds) {
        if (true && bucket instanceof TemplateOnlyComponentDebugBucket) {
            return;
        }
        if (!bucket) {
            return;
        }
        bucket.component.bounds = new Bounds(bounds);
    }
    didCreate(bucket) {
        if (true && bucket instanceof TemplateOnlyComponentDebugBucket) {
            return;
        }
        if (!bucket) {
            return;
        }
        bucket.component.didInsertElement();
    }
    getTag(bucket) {
        if (true && bucket instanceof TemplateOnlyComponentDebugBucket) {
            return CONSTANT_TAG;
        }
        if (!bucket) {
            return CONSTANT_TAG;
        }
        return bucket.tag;
    }
    update(bucket, scope) {
        if (true && bucket instanceof TemplateOnlyComponentDebugBucket) {
            return;
        }
        if (!bucket) {
            return;
        }
        bucket.component.args = bucket.namedArgsSnapshot();
    }
    didUpdateLayout() {}
    didUpdate(bucket) {
        if (true && bucket instanceof TemplateOnlyComponentDebugBucket) {
            return;
        }
        if (!bucket) {
            return;
        }
        bucket.component.didUpdate();
    }
    getDestructor(bucket) {
        if (true && bucket instanceof TemplateOnlyComponentDebugBucket) {
            return NOOP_DESTROYABLE;
        }
        if (!bucket) {
            return NOOP_DESTROYABLE;
        }
        return bucket.component;
    }
}
const NOOP_DESTROYABLE = { destroy() {} };

function isTypeSpecifier(specifier) {
    return specifier.indexOf(':') === -1;
}
/**
 * A repository of application objects, indexed by type and name.
 *
 * {@link Initializer | Initializers} can add or override objects in the system
 * before the application boots, customizing runtime behavior.
 *
 * @internal
 */
class ApplicationRegistry {
    constructor(registry, resolver) {
        this._registry = registry;
        this._resolver = resolver;
    }
    register(specifier, factory, options) {
        let normalizedSpecifier = this._toAbsoluteSpecifier(specifier);
        this._registry.register(normalizedSpecifier, factory, options);
    }
    registration(specifier) {
        let normalizedSpecifier = this._toAbsoluteSpecifier(specifier);
        return this._registry.registration(normalizedSpecifier);
    }
    unregister(specifier) {
        let normalizedSpecifier = this._toAbsoluteSpecifier(specifier);
        this._registry.unregister(normalizedSpecifier);
    }
    registerOption(specifier, option, value) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        this._registry.registerOption(normalizedSpecifier, option, value);
    }
    registeredOption(specifier, option) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        return this._registry.registeredOption(normalizedSpecifier, option);
    }
    registeredOptions(specifier) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        return this._registry.registeredOptions(normalizedSpecifier);
    }
    unregisterOption(specifier, option) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        this._registry.unregisterOption(normalizedSpecifier, option);
    }
    registerInjection(specifier, property, injection) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        let normalizedInjection = this._toAbsoluteSpecifier(injection);
        this._registry.registerInjection(normalizedSpecifier, property, normalizedInjection);
    }
    registeredInjections(specifier) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        return this._registry.registeredInjections(normalizedSpecifier);
    }
    _toAbsoluteSpecifier(specifier, referrer) {
        return this._resolver.identify(specifier, referrer);
    }
    _toAbsoluteOrTypeSpecifier(specifier) {
        if (isTypeSpecifier(specifier)) {
            return specifier;
        } else {
            return this._toAbsoluteSpecifier(specifier);
        }
    }
}

class DynamicScope {
    constructor(bucket = null) {
        if (bucket) {
            this.bucket = assign({}, bucket);
        } else {
            this.bucket = {};
        }
    }
    get(key) {
        return this.bucket[key];
    }
    set(key, reference) {
        return this.bucket[key] = reference;
    }
    child() {
        return new DynamicScope(this.bucket);
    }
}

class ArrayIterator {
    constructor(array, keyFor) {
        this.position = 0;
        this.array = array;
        this.keyFor = keyFor;
    }
    isEmpty() {
        return this.array.length === 0;
    }
    next() {
        let position = this.position,
            array = this.array,
            keyFor = this.keyFor;

        if (position >= array.length) return null;
        let value = array[position];
        let key = keyFor(value, position);
        let memo = position;
        this.position++;
        return { key, value, memo };
    }
}
class ObjectKeysIterator {
    constructor(keys, values, keyFor) {
        this.position = 0;
        this.keys = keys;
        this.values = values;
        this.keyFor = keyFor;
    }
    isEmpty() {
        return this.keys.length === 0;
    }
    next() {
        let position = this.position,
            keys = this.keys,
            values = this.values,
            keyFor = this.keyFor;

        if (position >= keys.length) return null;
        let value = values[position];
        let memo = keys[position];
        let key = keyFor(value, memo);
        this.position++;
        return { key, value, memo };
    }
}
class EmptyIterator {
    isEmpty() {
        return true;
    }
    next() {
        throw new Error(`Cannot call next() on an empty iterator`);
    }
}
const EMPTY_ITERATOR = new EmptyIterator();
/** @internal */
class Iterable {
    constructor(ref, keyFor) {
        this.tag = ref.tag;
        this.ref = ref;
        this.keyFor = keyFor;
    }
    iterate() {
        let ref = this.ref,
            keyFor = this.keyFor;

        let iterable = ref.value();
        if (Array.isArray(iterable)) {
            return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
        } else if (iterable === undefined || iterable === null) {
            return EMPTY_ITERATOR;
        } else if (iterable.forEach !== undefined) {
            let array = [];
            iterable.forEach(function (item) {
                array.push(item);
            });
            return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
        } else if (typeof iterable === 'object') {
            let keys = Object.keys(iterable);
            return keys.length > 0 ? new ObjectKeysIterator(keys, keys.map(key => iterable[key]), keyFor) : EMPTY_ITERATOR;
        } else {
            throw new Error(`Don't know how to {{#each ${iterable}}}`);
        }
    }
    valueReferenceFor(item) {
        return new UpdatableReference(item.value);
    }
    updateValueReference(reference, item) {
        reference.update(item.value);
    }
    memoReferenceFor(item) {
        return new UpdatableReference(item.memo);
    }
    updateMemoReference(reference, item) {
        reference.update(item.memo);
    }
}

/** @internal */
class Environment$1 extends Environment {
    static create(options = {}) {
        options.document = options.document || self.document;
        options.appendOperations = options.appendOperations || new DOMTreeConstruction(options.document);
        return new Environment$1(options);
    }
    constructor(options) {
        super({ appendOperations: options.appendOperations, updateOperations: new DOMChanges$1(options.document || document) });
        setOwner(this, getOwner(options));
        // TODO - required for `protocolForURL` - seek alternative approach
        // e.g. see `installPlatformSpecificProtocolForURL` in Ember
        this.uselessAnchor = options.document.createElement('a');
    }
    protocolForURL(url) {
        // TODO - investigate alternative approaches
        // e.g. see `installPlatformSpecificProtocolForURL` in Ember
        this.uselessAnchor.href = url;
        return this.uselessAnchor.protocol;
    }
    iterableFor(ref, keyPath) {
        let keyFor;
        if (!keyPath) {
            throw new Error('Must specify a key for #each');
        }
        switch (keyPath) {
            case '@index':
                keyFor = (_, index) => String(index);
                break;
            case '@primitive':
                keyFor = item => String(item);
                break;
            default:
                keyFor = item => item[keyPath];
                break;
        }
        return new Iterable(ref, keyFor);
    }
}

const DEFAULT_DOCUMENT = typeof document === 'object' ? document : null;
/**
 * The central control point for starting and running Glimmer components.
 *
 * @public
 */
class Application {
    constructor(options) {
        this._roots = [];
        this._rootsIndex = 0;
        this._initializers = [];
        this._initialized = false;
        this._rendering = false;
        this._rendered = false;
        this._scheduled = false;
        this._notifiers = [];
        this.rootName = options.rootName;
        this.resolver = options.resolver;
        debugAssert(options.loader, 'Must provide a Loader for preparing templates and other metadata required for a Glimmer Application.');
        debugAssert(options.renderer, 'Must provide a Renderer to render the templates produced by the Loader.');
        debugAssert(options.builder, 'Must provide a Builder that is responsible to building DOM.');
        this.document = options.document || DEFAULT_DOCUMENT;
        this.loader = options.loader;
        this.renderer = options.renderer;
        this.builder = options.builder;
    }
    /**
     * Renders a component by name into the provided element, and optionally
     * adjacent to the provided nextSibling element.
     *
     * ## Examples
     *
     * ```js
     * app.renderComponent('MyComponent', document.body, document.getElementById('my-footer'));
     * ```
     */
    renderComponent(component, parent, nextSibling = null) {
        let roots = this._roots,
            self = this._self;

        roots.push({ id: this._rootsIndex++, component, parent, nextSibling });
        // If we've already rendered, need to invalidate the root reference and
        // schedule a re-render for the new component to appear in DOM.
        if (self) {
            self.update({ roots });
            this.scheduleRerender();
        }
    }
    /**
     * Initializes the application and renders any components that have been
     * registered via [renderComponent].
     *
     * @public
     */
    async boot() {
        this.initialize();
        this.env = this.lookup(`environment:/${this.rootName}/main/main`);
        await this._render();
    }
    /**
     * Schedules all components to revalidate and potentially update the DOM to
     * reflect any changes to underlying component state.
     *
     * Generally speaking, you  should avoid calling `scheduleRerender()`
     * manually. Instead, use tracked properties on components and models, which
     * invoke this method for you automatically when appropriate.
     */
    scheduleRerender() {
        if (this._scheduled || !this._rendered) return;
        this._rendering = true;
        this._scheduled = true;
        setTimeout(() => {
            this._scheduled = false;
            this._rerender();
            this._rendering = false;
        }, 0);
    }
    /** @internal */
    initialize() {
        this.initRegistry();
        this.initContainer();
    }
    /** @internal */
    registerInitializer(initializer) {
        this._initializers.push(initializer);
    }
    /**
     * Initializes the registry, which maps names to objects in the system. Addons
     * and subclasses can customize the behavior of a Glimmer application by
     * overriding objects in the registry.
     *
     * @internal
     */
    initRegistry() {
        let registry = this._registry = new Registry();
        // Create ApplicationRegistry as a proxy to the underlying registry
        // that will only be available during `initialize`.
        let appRegistry = new ApplicationRegistry(this._registry, this.resolver);
        registry.register(`environment:/${this.rootName}/main/main`, Environment$1);
        registry.registerOption('helper', 'instantiate', false);
        registry.registerOption('template', 'instantiate', false);
        registry.register(`document:/${this.rootName}/main/main`, this.document);
        registry.registerOption('document', 'instantiate', false);
        registry.registerInjection('environment', 'document', `document:/${this.rootName}/main/main`);
        registry.registerInjection('component-manager', 'env', `environment:/${this.rootName}/main/main`);
        let initializers = this._initializers;
        for (let i = 0; i < initializers.length; i++) {
            initializers[i].initialize(appRegistry);
        }
        this._initialized = true;
    }
    /**
     * Initializes the container, which stores instances of objects that come from
     * the registry.
     *
     * @internal
     */
    initContainer() {
        this._container = new Container(this._registry, this.resolver);
        // Inject `this` (the app) as the "owner" of every object instantiated
        // by its container.
        this._container.defaultInjections = specifier => {
            let hash = {};
            setOwner(hash, this);
            return hash;
        };
    }
    /** @internal */
    async _render() {
        let env = this.env;
        // Create the template context for the root `main` template, which just
        // contains the array of component roots. Any property references in that
        // template will be looked up from this object.

        let self = this._self = new UpdatableReference({ roots: this._roots });
        // Create an empty root scope.
        let dynamicScope = new DynamicScope();
        let builder = this.builder.getBuilder(env);
        let templateIterator = await this.loader.getTemplateIterator(this, env, builder, dynamicScope, self);
        try {
            // Begin a new transaction. The transaction stores things like component
            // lifecycle events so they can be flushed once rendering has completed.
            env.begin();
            await this.renderer.render(templateIterator);
            // Finally, commit the transaction and flush component lifecycle hooks.
            env.commit();
            this._didRender();
        } catch (err) {
            this._didError(err);
            throw err;
        }
    }
    /**
     * Ensures the DOM is up-to-date by performing a revalidation on the root
     * template's render result. This method should not be called directly;
     * instead, any mutations in the program that could cause side-effects should
     * call `scheduleRerender()`, which ensures that DOM updates only happen once
     * at the end of the browser's event loop.
     *
     * @internal
     */
    async _rerender() {
        let env = this.env;

        try {
            env.begin();
            await this.renderer.rerender();
            env.commit();
            this._didRender();
        } catch (err) {
            this._didError(err);
            throw err;
        }
    }
    _didRender() {
        this._rendered = true;
        let notifiers = this._notifiers;
        this._notifiers = [];
        notifiers.forEach(n => n[0]());
    }
    _didError(err) {
        let notifiers = this._notifiers;
        this._notifiers = [];
        notifiers.forEach(n => n[1](err));
    }
    /**
     * Owner interface implementation
     *
     * @internal
     */
    identify(specifier, referrer) {
        return this.resolver.identify(specifier, referrer);
    }
    /** @internal */
    factoryFor(specifier, referrer) {
        return this._container.factoryFor(this.identify(specifier, referrer));
    }
    /** @internal */
    lookup(specifier, referrer) {
        return this._container.lookup(this.identify(specifier, referrer));
    }
}

class TypedRegistry {
    constructor() {
        this.byName = dict();
        this.byHandle = dict();
    }
    hasName(name) {
        return name in this.byName;
    }
    getHandle(name) {
        return this.byName[name];
    }
    hasHandle(name) {
        return name in this.byHandle;
    }
    getByHandle(handle) {
        return this.byHandle[handle];
    }
    register(handle, name, value) {
        this.byHandle[handle] = value;
        this.byName[name] = handle;
    }
}

class HelperReference {
    constructor(helper, args) {
        this.helper = helper;
        this.tag = args.tag;
        this.args = args.capture();
    }
    value() {
        let helper = this.helper,
            args = this.args;

        return helper(args.positional.value(), args.named.value());
    }
    get() {
        return new RootReference(this);
    }
}

/** @public */
class RuntimeResolver {
    constructor(owner) {
        this.owner = owner;
        this.handleLookup = [];
        this.cache = {
            component: new TypedRegistry(),
            template: new TypedRegistry(),
            compiledTemplate: new TypedRegistry(),
            helper: new TypedRegistry(),
            manager: new TypedRegistry(),
            modifier: new TypedRegistry()
        };
    }
    setCompileOptions(compileOptions) {
        this.templateOptions = compileOptions;
    }
    lookup(type, name, referrer) {
        if (this.cache[type].hasName(name)) {
            return this.cache[type].getHandle(name);
        } else {
            return null;
        }
    }
    register(type, name, value) {
        let registry = this.cache[type];
        let handle = this.handleLookup.length;
        this.handleLookup.push(registry);
        this.cache[type].register(handle, name, value);
        return handle;
    }
    lookupModifier(name, meta) {
        let handle = this.lookup('modifier', name);
        if (handle === null) {
            throw new Error(`Modifier for ${name} not found.`);
        }
        return handle;
    }
    compileTemplate(name, layout) {
        if (!this.cache.compiledTemplate.hasName(name)) {
            let serializedTemplate = this.resolve(layout);
            let block = serializedTemplate.block,
                meta = serializedTemplate.meta,
                id = serializedTemplate.id;

            let parsedBlock = JSON.parse(block);
            let template = new ScannableTemplate(this.templateOptions, { id, block: parsedBlock, referrer: meta }).asLayout();
            let invocation = {
                handle: template.compile(),
                symbolTable: template.symbolTable
            };
            this.register('compiledTemplate', name, invocation);
            return invocation;
        }
        let handle = this.lookup('compiledTemplate', name);
        return this.resolve(handle);
    }
    registerHelper(name, helper) {
        let glimmerHelper = (_vm, args) => new HelperReference(helper, args);
        return this.register('helper', name, glimmerHelper);
    }
    registerInternalHelper(name, helper) {
        this.register('helper', name, helper);
    }
    registerComponent(name, resolvedSpecifier, Component, template) {
        let templateEntry = this.registerTemplate(resolvedSpecifier, template);
        let manager = this.managerFor(templateEntry.meta.managerId);
        let definition = new ComponentDefinition(name, manager, Component, templateEntry.handle);
        return this.register('component', name, definition);
    }
    lookupComponentHandle(name, referrer) {
        if (!this.cache.component.hasName(name)) {
            this.lookupComponent(name, referrer);
        }
        return this.lookup('component', name, referrer);
    }
    managerFor(managerId = 'main') {
        let manager;
        if (!this.cache.manager.hasName(managerId)) {
            let rootName = this.owner.rootName;

            manager = this.owner.lookup(`component-manager:/${rootName}/component-managers/${managerId}`);
            if (!manager) {
                throw new Error(`No component manager found for ID ${managerId}.`);
            }
            this.register('manager', managerId, manager);
            return manager;
        } else {
            let handle = this.cache.manager.getHandle(managerId);
            return this.cache.manager.getByHandle(handle);
        }
    }
    registerTemplate(resolvedSpecifier, template) {
        return {
            name: resolvedSpecifier,
            handle: this.register('template', resolvedSpecifier, template),
            meta: template.meta
        };
    }
    lookupComponent(name, meta) {
        let handle;
        if (!this.cache.component.hasName(name)) {
            let specifier = expect(this.identifyComponent(name, meta), `Could not find the component '${name}'`);
            let template = this.owner.lookup('template', specifier);
            let componentSpecifier = this.owner.identify('component', specifier);
            let componentFactory = null;
            if (componentSpecifier !== undefined) {
                componentFactory = this.owner.factoryFor(componentSpecifier);
            }
            handle = this.registerComponent(name, specifier, componentFactory, template);
        } else {
            handle = this.lookup('component', name, meta);
        }
        return this.resolve(handle);
    }
    lookupHelper(name, meta) {
        if (!this.cache.helper.hasName(name)) {
            let owner = this.owner;
            let relSpecifier = `helper:${name}`;
            let referrer = meta.specifier;
            let specifier = owner.identify(relSpecifier, referrer);
            if (specifier === undefined) {
                return null;
            }
            let helper = this.owner.lookup(specifier, meta.specifier);
            return this.registerHelper(name, helper);
        }
        return this.lookup('helper', name, meta);
    }
    lookupPartial(name, meta) {
        throw new Error("Partials are not available in Glimmer applications.");
    }
    resolve(handle) {
        let registry = this.handleLookup[handle];
        return registry.getByHandle(handle);
    }
    identifyComponent(name, meta) {
        let owner = this.owner;
        let relSpecifier = `template:${name}`;
        let referrer = meta.specifier;
        let specifier = owner.identify(relSpecifier, referrer);
        if (specifier === undefined && owner.identify(`component:${name}`, referrer)) {
            throw new Error(`The component '${name}' is missing a template. All components must have a template. Make sure there is a template.hbs in the component directory.`);
        }
        return specifier;
    }
}

const UNRESOLVED = {};
const WELL_KNOWN_EMPTY_ARRAY_POSITION = 0;
const WELL_KNOW_EMPTY_ARRAY = Object.freeze([]);
class WriteOnlyConstants {
    constructor() {
        // `0` means NULL
        this.strings = [];
        this.arrays = [WELL_KNOW_EMPTY_ARRAY];
        this.tables = [];
        this.handles = [];
        this.resolved = [];
        this.floats = [];
        this.negatives = [];
    }
    float(float) {
        let index = this.floats.indexOf(float);
        if (index > -1) {
            return index;
        }
        return this.floats.push(float) - 1;
    }
    negative(negative) {
        return this.negatives.push(negative) - 1;
    }
    string(value) {
        let index = this.strings.indexOf(value);
        if (index > -1) {
            return index;
        }
        return this.strings.push(value) - 1;
    }
    stringArray(strings) {
        let _strings = new Array(strings.length);
        for (let i = 0; i < strings.length; i++) {
            _strings[i] = this.string(strings[i]);
        }
        return this.array(_strings);
    }
    array(values) {
        if (values.length === 0) {
            return WELL_KNOWN_EMPTY_ARRAY_POSITION;
        }
        let index = this.arrays.indexOf(values);
        if (index > -1) {
            return index;
        }
        return this.arrays.push(values) - 1;
    }
    handle(handle) {
        let index = this.handles.indexOf(handle);
        if (index > -1) {
            return index;
        }
        this.resolved.push(UNRESOLVED);
        return this.handles.push(handle) - 1;
    }
    serializable(value) {
        let str = JSON.stringify(value);
        let index = this.strings.indexOf(str);
        if (index > -1) {
            return index;
        }
        return this.strings.push(str) - 1;
    }
    toPool() {
        return {
            strings: this.strings,
            arrays: this.arrays,
            handles: this.handles,
            floats: this.floats,
            negatives: this.negatives
        };
    }
}

class Constants extends WriteOnlyConstants {
    constructor(resolver, pool) {
        super();
        this.resolver = resolver;
        if (pool) {
            this.strings = pool.strings;
            this.arrays = pool.arrays;
            this.handles = pool.handles;
            this.floats = pool.floats;
            this.negatives = pool.negatives;
            this.resolved = this.handles.map(() => UNRESOLVED);
        }
    }
    // `0` means NULL
    getFloat(value) {
        return this.floats[value];
    }
    getNegative(value) {
        return this.negatives[value];
    }
    getString(value) {
        return this.strings[value];
    }
    getStringArray(value) {
        let names = this.getArray(value);
        let _names = new Array(names.length);
        for (let i = 0; i < names.length; i++) {
            let n = names[i];
            _names[i] = this.getString(n);
        }
        return _names;
    }
    getArray(value) {
        return this.arrays[value];
    }
    resolveHandle(index) {
        let resolved = this.resolved[index];
        if (resolved === UNRESOLVED) {
            let handle = this.handles[index];
            resolved = this.resolved[index] = this.resolver.resolve(handle);
        }
        return resolved;
    }
    getSerializable(s) {
        return JSON.parse(this.strings[s]);
    }
}
class LazyConstants extends Constants {
    constructor() {
        super(...arguments);
        this.others = [];
        this.serializables = [];
    }
    serializable(value) {
        let index = this.serializables.indexOf(value);
        if (index > -1) {
            return index;
        }
        return this.serializables.push(value) - 1;
    }
    getSerializable(s) {
        return this.serializables[s];
    }
    getOther(value) {
        return this.others[value - 1];
    }
    other(other) {
        return this.others.push(other);
    }
}

class Opcode {
    constructor(heap) {
        this.heap = heap;
        this.offset = 0;
    }
    get size() {
        let rawType = this.heap.getbyaddr(this.offset);
        return ((rawType & 768 /* OPERAND_LEN_MASK */) >> 8 /* ARG_SHIFT */) + 1;
    }
    get isMachine() {
        let rawType = this.heap.getbyaddr(this.offset);
        return rawType & 1024 /* MACHINE_MASK */;
    }
    get type() {
        return this.heap.getbyaddr(this.offset) & 255 /* TYPE_MASK */;
    }
    get op1() {
        return this.heap.getbyaddr(this.offset + 1);
    }
    get op2() {
        return this.heap.getbyaddr(this.offset + 2);
    }
    get op3() {
        return this.heap.getbyaddr(this.offset + 3);
    }
}

function encodeTableInfo(size, scopeSize, state) {
    return size | scopeSize << 16 | state << 30;
}
function changeState(info, newState) {
    return info | newState << 30;
}
/**
 * The Heap is responsible for dynamically allocating
 * memory in which we read/write the VM's instructions
 * from/to. When we malloc we pass out a VMHandle, which
 * is used as an indirect way of accessing the memory during
 * execution of the VM. Internally we track the different
 * regions of the memory in an int array known as the table.
 *
 * The table 32-bit aligned and has the following layout:
 *
 * | ... | hp (u32) |       info (u32)          |
 * | ... |  Handle  | Size | Scope Size | State |
 * | ... | 32-bits  | 16b  |    14b     |  2b   |
 *
 * With this information we effectively have the ability to
 * control when we want to free memory. That being said you
 * can not free during execution as raw address are only
 * valid during the execution. This means you cannot close
 * over them as you will have a bad memory access exception.
 */
class Heap {
    constructor(serializedHeap) {
        this.placeholders = [];
        this.offset = 0;
        this.handle = 0;
        if (serializedHeap) {
            let buffer = serializedHeap.buffer,
                table = serializedHeap.table,
                handle = serializedHeap.handle;

            this.heap = new Uint16Array(buffer);
            this.table = table;
            this.offset = this.heap.length;
            this.handle = handle;
        } else {
            this.heap = new Uint16Array(0x100000);
            this.table = [];
        }
    }
    push(item) {
        this.heap[this.offset++] = item;
    }
    getbyaddr(address) {
        return this.heap[address];
    }
    setbyaddr(address, value) {
        this.heap[address] = value;
    }
    malloc() {
        this.table.push(this.offset, 0);
        let handle = this.handle;
        this.handle += 2 /* ENTRY_SIZE */;
        return handle;
    }
    finishMalloc(handle, scopeSize) {
        let start = this.table[handle];
        let finish = this.offset;
        let instructionSize = finish - start;
        let info = encodeTableInfo(instructionSize, scopeSize, 0 /* Allocated */);
        this.table[handle + 1 /* INFO_OFFSET */] = info;
    }
    size() {
        return this.offset;
    }
    // It is illegal to close over this address, as compaction
    // may move it. However, it is legal to use this address
    // multiple times between compactions.
    getaddr(handle) {
        return this.table[handle];
    }
    gethandle(address) {
        this.table.push(address, encodeTableInfo(0, 0, 3 /* Pointer */));
        let handle = this.handle;
        this.handle += 2 /* ENTRY_SIZE */;
        return handle;
    }
    sizeof(handle) {
        return -1;
    }
    scopesizeof(handle) {
        let info = this.table[handle + 1 /* INFO_OFFSET */];
        return (info & 1073676288 /* SCOPE_MASK */) >> 16;
    }
    free(handle) {
        let info = this.table[handle + 1 /* INFO_OFFSET */];
        this.table[handle + 1 /* INFO_OFFSET */] = changeState(info, 1 /* Freed */);
    }
    /**
     * The heap uses the [Mark-Compact Algorithm](https://en.wikipedia.org/wiki/Mark-compact_algorithm) to shift
     * reachable memory to the bottom of the heap and freeable
     * memory to the top of the heap. When we have shifted all
     * the reachable memory to the top of the heap, we move the
     * offset to the next free position.
     */
    compact() {
        let compactedSize = 0;
        let table = this.table,
            length = this.table.length,
            heap = this.heap;

        for (let i = 0; i < length; i += 2 /* ENTRY_SIZE */) {
            let offset = table[i];
            let info = table[i + 1 /* INFO_OFFSET */];
            let size = info & 65535;
            let state = info & 3221225472 /* STATE_MASK */ >> 30;
            if (state === 2 /* Purged */) {
                    continue;
                } else if (state === 1 /* Freed */) {
                    // transition to "already freed" aka "purged"
                    // a good improvement would be to reuse
                    // these slots
                    table[i + 1 /* INFO_OFFSET */] = changeState(info, 2 /* Purged */);
                    compactedSize += size;
                } else if (state === 0 /* Allocated */) {
                    for (let j = offset; j <= i + size; j++) {
                        heap[j - compactedSize] = heap[j];
                    }
                    table[i] = offset - compactedSize;
                } else if (state === 3 /* Pointer */) {
                    table[i] = offset - compactedSize;
                }
        }
        this.offset = this.offset - compactedSize;
    }
    pushPlaceholder(valueFunc) {
        let address = this.offset++;
        this.heap[address] = 65535 /* MAX_SIZE */;
        this.placeholders.push([address, valueFunc]);
    }
    patchPlaceholders() {
        let placeholders = this.placeholders;

        for (let i = 0; i < placeholders.length; i++) {
            var _placeholders$i = placeholders[i];
            let address = _placeholders$i[0],
                getValue = _placeholders$i[1];

            false && debugAssert(this.getbyaddr(address) === 65535 /* MAX_SIZE */, `expected to find a placeholder value at ${address}`);

            this.setbyaddr(address, getValue());
        }
    }
    capture() {
        this.patchPlaceholders();
        // Only called in eager mode
        let buffer = slice(this.heap, 0, this.offset);
        return {
            handle: this.handle,
            table: this.table,
            buffer: buffer
        };
    }
}
class WriteOnlyProgram {
    constructor(constants = new WriteOnlyConstants(), heap = new Heap()) {
        this.constants = constants;
        this.heap = heap;
        this._opcode = new Opcode(this.heap);
    }
    opcode(offset) {
        this._opcode.offset = offset;
        return this._opcode;
    }
}

class Program extends WriteOnlyProgram {}
function slice(arr, start, end) {
    if (arr instanceof Uint16Array) {
        if (arr.slice !== undefined) {
            return arr.slice(start, end).buffer;
        }
        let ret = new Uint16Array(end);
        for (; start < end; start++) {
            ret[start] = arr[start];
        }
        return ret.buffer;
    }
    return null;
}

var mainTemplate = { "id": "j7SGa6Pm", "block": "{\"symbols\":[\"root\"],\"statements\":[[4,\"each\",[[22,[\"roots\"]]],[[\"key\"],[\"id\"]],{\"statements\":[[4,\"in-element\",[[21,1,[\"parent\"]]],[[\"guid\",\"nextSibling\"],[\"%cursor:0%\",[21,1,[\"nextSibling\"]]]],{\"statements\":[[1,[26,\"component\",[[21,1,[\"component\"]]],null],false]],\"parameters\":[]},null]],\"parameters\":[1]},null]],\"hasEval\":false}", "meta": { "specifier": "template:/-application/application/src/templates/main" } };

/** @internal */
function buildAction(vm, _args) {
    let componentRef = vm.getSelf();
    let args = _args.capture();
    let actionFunc = args.positional.at(0).value();
    if (typeof actionFunc !== 'function') {
        throwNoActionError(actionFunc, args.positional.at(0));
    }
    return new UpdatableReference(function action(...invokedArgs) {
        let curriedArgs = args.positional.value();
        // Consume the action function that was already captured above.
        curriedArgs.shift();
        curriedArgs.push(...invokedArgs);
        // Invoke the function with the component as the context, the curried
        // arguments passed to `{{action}}`, and the arguments the bound function
        // was invoked with.
        actionFunc.apply(componentRef && componentRef.value(), curriedArgs);
    });
}
function throwNoActionError(actionFunc, actionFuncReference) {
    let referenceInfo = debugInfoForReference(actionFuncReference);
    throw new Error(`You tried to create an action with the {{action}} helper, but the first argument ${referenceInfo}was ${typeof actionFunc} instead of a function.`);
}
/** @internal */
function debugInfoForReference(reference) {
    let message = '';
    let parent;
    let property;
    if (reference === null || reference === undefined) {
        return message;
    }
    if ('parent' in reference && 'property' in reference) {
        parent = reference['parent'].value();
        property = reference['property'];
    } else if ('_parentValue' in reference && '_propertyKey' in reference) {
        parent = reference['_parentValue'];
        property = reference['_propertyKey'];
    }
    if (property !== undefined) {
        message += `('${property}' on ${debugName(parent)}) `;
    }
    return message;
}
function debugName(obj) {
    let objType = typeof obj;
    if (obj === null || obj === undefined) {
        return objType;
    } else if (objType === 'number' || objType === 'boolean') {
        return obj.toString();
    } else {
        if (obj['debugName']) {
            return obj['debugName'];
        }
        try {
            return JSON.stringify(obj);
        } catch (e) {}
        return obj.toString();
    }
}

/** @internal */
function ifHelper(params) {
    return params[0] ? params[1] : params[2];
}

class CompileTimeLookup {
    constructor(resolver) {
        this.resolver = resolver;
    }
    getComponentDefinition(handle) {
        let spec = this.resolver.resolve(handle);
        debugAssert(!!spec, `Couldn't find a template for ${handle}`);
        return spec;
    }
    getCapabilities(handle) {
        let definition = this.getComponentDefinition(handle);
        let manager = definition.manager,
            state = definition.state;

        return manager.getCapabilities(state);
    }
    getLayout(handle) {
        let definition = this.getComponentDefinition(handle);
        let manager = definition.manager;

        let invocation = manager.getLayout(definition, this.resolver);
        return {
            compile() {
                return invocation.handle;
            },
            symbolTable: invocation.symbolTable
        };
    }
    lookupHelper(name, referrer) {
        return this.resolver.lookupHelper(name, referrer);
    }
    lookupModifier(name, referrer) {
        return this.resolver.lookupModifier(name, referrer);
    }
    lookupComponentDefinition(name, referrer) {
        return this.resolver.lookupComponentHandle(name, referrer);
    }
    lookupPartial(name, referrer) {
        return this.resolver.lookupPartial(name, referrer);
    }
}

/**
 * The RuntimeCompilerLoader is used by Glimmer.js applications that perform the
 * final template compilation step client-side. It configures the compiler to
 * resolve templates, helpers and other objects from the runtime registry, and
 * enables just-in-time compilation of templates as they are encountered.
 *
 * @public
 */
class RuntimeCompilerLoader {
    constructor(resolver) {
        this.resolver = resolver;
    }
    async getTemplateIterator(app, env, builder, dynamicScope, self) {
        let resolver = new RuntimeResolver(app);
        let program = new Program(new LazyConstants(resolver));
        let macros = new Macros();
        let lookup = new CompileTimeLookup(resolver);
        let compileOptions = {
            program,
            macros,
            resolver: lookup,
            Builder: LazyOpcodeBuilder
        };
        resolver.setCompileOptions(compileOptions);
        resolver.registerTemplate('main', mainTemplate);
        resolver.registerInternalHelper('action', buildAction);
        resolver.registerHelper('if', ifHelper);
        let mainLayout = templateFactory(mainTemplate).create(compileOptions);
        return Promise.resolve(mainLayout.renderLayout({
            env,
            builder,
            dynamicScope,
            self
        }));
    }
}

/**
 * A {@link Builder} that creates DOM elements when templates render.
 *
 * Use a DOMBuilder for Glimmer.js applications that do not use server-side
 * rendering. If you are using server-side rendering, the
 * {@link RehydratingBuilder} can be used to rehydrate existing DOM instead of
 * replacing it.
 *
 * @public
 */
class DOMBuilder {
    constructor({ element, nextSibling = null }) {
        this.cursor = { element, nextSibling };
    }
    getBuilder(env) {
        return clientBuilder(env, this.cursor);
    }
}

/**
 * Performs a synchronous initial render of templates.
 *
 * @remarks
 *
 * The SyncRenderer will render a template as fast as possible, continuing to
 * work until the template has been completely rendered.
 *
 * While this delivers the fastest absolute rendering performance, large
 * templates may cause the main thread to be consumed for long periods of time,
 * leading to user-noticeable performance degradation, or jank.
 *
 * See also: {@link AsyncRenderer}
 *
 * @public
 */
class SyncRenderer {
    render(iterator) {
        // Iterate the template iterator, executing the compiled template program
        // until there are no more instructions left to execute.
        let result;
        do {
            result = iterator.next();
        } while (!result.done);
        this.result = result.value;
    }
    rerender() {
        if (!this.result) {
            throw new Error('Cannot re-render before initial render has completed');
        }
        this.result.rerender();
    }
}

// TODO - use symbol

function isSpecifierStringAbsolute$1(specifier) {
    var _specifier$split = specifier.split(':');

    let type = _specifier$split[0],
        path = _specifier$split[1];

    return !!(type && path && path.indexOf('/') === 0 && path.split('/').length > 3);
}
function isSpecifierObjectAbsolute$1(specifier) {
    return specifier.rootName !== undefined && specifier.collection !== undefined && specifier.name !== undefined && specifier.type !== undefined;
}
function serializeSpecifier$1(specifier) {
    let type = specifier.type;
    let path = serializeSpecifierPath$1(specifier);
    if (path) {
        return type + ':' + path;
    } else {
        return type;
    }
}
function serializeSpecifierPath$1(specifier) {
    let path = [];
    if (specifier.rootName) {
        path.push(specifier.rootName);
    }
    if (specifier.collection) {
        path.push(specifier.collection);
    }
    if (specifier.namespace) {
        path.push(specifier.namespace);
    }
    if (specifier.name) {
        path.push(specifier.name);
    }
    if (path.length > 0) {
        let fullPath = path.join('/');
        if (isSpecifierObjectAbsolute$1(specifier)) {
            fullPath = '/' + fullPath;
        }
        return fullPath;
    }
}
function deserializeSpecifier$1(specifier) {
    let obj = {};
    if (specifier.indexOf(':') > -1) {
        var _specifier$split2 = specifier.split(':');

        let type = _specifier$split2[0],
            path = _specifier$split2[1];

        obj.type = type;
        let pathSegments;
        if (path.indexOf('/') === 0) {
            pathSegments = path.substr(1).split('/');
            obj.rootName = pathSegments.shift();
            obj.collection = pathSegments.shift();
        } else {
            pathSegments = path.split('/');
        }
        if (pathSegments.length > 0) {
            obj.name = pathSegments.pop();
            if (pathSegments.length > 0) {
                obj.namespace = pathSegments.join('/');
            }
        }
    } else {
        obj.type = specifier;
    }
    return obj;
}

function assert$1(description, test) {
    if (!test) {
        throw new Error('Assertion Failed: ' + description);
    }
}

function detectLocalResolutionCollection(specifier) {
    let namespace = specifier.namespace,
        collection = specifier.collection;
    // Look for the local-most private collection contained in the namespace
    // (which will appear closest to the end of the string)

    let startPos = namespace.lastIndexOf('/-');
    if (startPos > -1) {
        startPos += 2;
        let endPos = namespace.indexOf('/', startPos);
        collection = namespace.slice(startPos, endPos > -1 ? endPos : undefined);
    }
    return collection;
}

class Resolver {
    constructor(config, registry) {
        this.config = config;
        this.registry = registry;
    }
    identify(specifier, referrer) {
        if (isSpecifierStringAbsolute$1(specifier)) {
            return specifier;
        }
        let s = deserializeSpecifier$1(specifier);
        let result;
        if (referrer) {
            let r = deserializeSpecifier$1(referrer);
            if (isSpecifierObjectAbsolute$1(r)) {
                assert$1('Specifier must not include a rootName, collection, or namespace when combined with an absolute referrer', s.rootName === undefined && s.collection === undefined && s.namespace === undefined);
                s.rootName = r.rootName;
                s.collection = r.collection;
                let definitiveCollection = this._definitiveCollection(s.type);
                if (!s.name) {
                    /*
                     * For specifiers without a name use the referrer's name and
                     * do not fallback to any other resolution rules.
                     */
                    s.namespace = r.namespace;
                    s.name = r.name;
                    return this._serializeAndVerify(s);
                }
                s.namespace = r.namespace ? r.namespace + '/' + r.name : r.name;
                if (detectLocalResolutionCollection(s) === definitiveCollection) {
                    /*
                     * For specifiers with a name, try local resolution. Based on
                     * the referrer.
                     */
                    if (result = this._serializeAndVerify(s)) {
                        return result;
                    }
                }
                // Look for a private collection in the referrer's namespace
                if (definitiveCollection) {
                    s.namespace += '/-' + definitiveCollection;
                    if (result = this._serializeAndVerify(s)) {
                        return result;
                    }
                }
                // Because local and private resolution has failed, clear all but `name` and `type`
                // to proceed with top-level resolution
                s.rootName = s.collection = s.namespace = undefined;
            } else {
                assert$1('Referrer must either be "absolute" or include a `type` to determine the associated type', r.type);
                // Look in the definitive collection for the associated type
                s.collection = this._definitiveCollection(r.type);
                if (!s.namespace) {
                    s.namespace = r.rootName;
                }
                assert$1(`'${r.type}' does not have a definitive collection`, s.collection);
            }
        }
        // If the collection is unspecified, use the definitive collection for the `type`
        if (!s.collection) {
            s.collection = this._definitiveCollection(s.type);
            assert$1(`'${s.type}' does not have a definitive collection`, s.collection);
        }
        if (!s.rootName) {
            // If the root name is unspecified, try the app's `rootName` first
            s.rootName = this.config.app.rootName || 'app';
            if (result = this._serializeAndVerify(s)) {
                return result;
            }
            // Then look for an addon with a matching `rootName`
            if (s.namespace) {
                s.rootName = s.namespace;
                s.namespace = undefined;
            } else {
                s.rootName = s.name;
                s.name = 'main';
            }
        }
        if (result = this._serializeAndVerify(s)) {
            return result;
        }
    }
    retrieve(specifier) {
        return this.registry.get(specifier);
    }
    resolve(specifier, referrer) {
        let id = this.identify(specifier, referrer);
        if (id) {
            return this.retrieve(id);
        }
    }
    _definitiveCollection(type) {
        let typeDef = this.config.types[type];
        assert$1(`'${type}' is not a recognized type`, typeDef);
        return typeDef.definitiveCollection;
    }
    _serializeAndVerify(specifier) {
        let serialized = serializeSpecifier$1(specifier);
        if (this.registry.has(serialized)) {
            return serialized;
        }
    }
}

class BasicRegistry {
    constructor(entries = {}) {
        this._entries = entries;
    }
    has(specifier) {
        return specifier in this._entries;
    }
    get(specifier) {
        return this._entries[specifier];
    }
}

class MyApp extends Component {}

var __ui_components_MyApp_template__ = { "id": "8hSnflRX", "block": "{\"symbols\":[],\"statements\":[[6,\"div\"],[8],[0,\"\\n    \"],[5,\"WeatherTracker\",[],[[],[]],{\"statements\":[],\"parameters\":[]}],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/my-app/components/MyApp" } };

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = undefined && undefined.__awaiter || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }
        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }
        function step(result) {
            result.done ? resolve(result.value) : new P(function (resolve) {
                resolve(result.value);
            }).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class WeatherTracker extends Component {
    constructor(options) {
        super(options);
        this.loadWeather();
    }
    loadWeather() {
        return __awaiter(this, void 0, void 0, function* () {
            let response = yield fetch('/weather/10014.json');
            this.weather = yield response.json();
            setTimeout(() => {
                this.loadWeather();
            }, 2000);
        });
    }
}
__decorate([tracked], WeatherTracker.prototype, "weather", void 0);

var __ui_components_WeatherTracker_template__ = { "id": "yqrJvaDd", "block": "{\"symbols\":[],\"statements\":[[6,\"div\"],[10,\"class\",\"Weather\"],[8],[0,\"\\n    \"],[6,\"h2\"],[8],[0,\"Current weather\"],[9],[0,\"\\n\\n    \"],[6,\"address\"],[8],[0,\"\\n        New York, NY\\n    \"],[9],[0,\"\\n\\n    \"],[6,\"div\"],[8],[0,\"\\n        \"],[6,\"strong\"],[8],[0,\"\\n            \"],[1,[22,[\"weather\",\"temperature\"]],false],[0,\"degrees\\n        \"],[9],[0,\"\\n    \"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/my-app/components/WeatherTracker" } };

var moduleMap = { 'component:/my-app/components/MyApp': MyApp, 'template:/my-app/components/MyApp': __ui_components_MyApp_template__, 'component:/my-app/components/WeatherTracker': WeatherTracker, 'template:/my-app/components/WeatherTracker': __ui_components_WeatherTracker_template__ };

var resolverConfiguration = { "app": { "name": "my-app", "rootName": "my-app" }, "types": { "application": { "definitiveCollection": "main" }, "component": { "definitiveCollection": "components" }, "component-test": { "unresolvable": true }, "helper": { "definitiveCollection": "components" }, "helper-test": { "unresolvable": true }, "renderer": { "definitiveCollection": "main" }, "template": { "definitiveCollection": "components" } }, "collections": { "main": { "types": ["application", "renderer"] }, "components": { "group": "ui", "types": ["component", "component-test", "template", "helper", "helper-test"], "defaultType": "component", "privateCollections": ["utils"] }, "styles": { "group": "ui", "unresolvable": true }, "utils": { "unresolvable": true } } };

class App extends Application {
    constructor() {
        let moduleRegistry = new BasicRegistry(moduleMap);
        let resolver = new Resolver(resolverConfiguration, moduleRegistry);
        const element = document.body;
        super({
            builder: new DOMBuilder({ element, nextSibling: null }),
            loader: new RuntimeCompilerLoader(resolver),
            renderer: new SyncRenderer(),
            resolver,
            rootName: resolverConfiguration.app.rootName
        });
    }
}

const app = new App();
const containerElement = document.getElementById('app');
setPropertyDidChange(() => {
    app.scheduleRerender();
});
app.registerInitializer({
    initialize(registry) {
        registry.register(`component-manager:/${app.rootName}/component-managers/main`, ComponentManager);
    }
});
app.renderComponent('MyApp', containerElement, null);
app.boot();

})));

//# sourceMappingURL=app.js.map
