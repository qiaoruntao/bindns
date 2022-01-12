export default class Ptr<T> {
    private p: T;

    constructor(val) {
        this.p = val;
    }

    get() {
        return this.p;
    }

    set(val) {
        return this.p = val;
    }
};
