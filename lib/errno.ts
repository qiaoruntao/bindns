// Unix system error codes
let errno_val = 0;
/**
 * Gets/sets the "global" `errno`.
 * @param {number} v
 */
export const errno = function (v) {
    if (v === undefined) return errno_val;
    errno_val = v;
};

/** No such file or directory */
export const ENOENT = 2;
/** No such device */
export const ENODEV = 19;
/** Is a directory */
export const EISDIR = 21;
/** Invalid argument */
export const EINVAL = 22;
/** File name too long */
export const ENAMETOOLONG = 36;
/** Message too long */
export const EMSGSIZE = 90;
