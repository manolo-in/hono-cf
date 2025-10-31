declare global {
    interface ObjectConstructor {
        keys<T>(obj: T): Array<keyof T>;
        values<T>(obj: T): Array<T[keyof T]>;
        entries<T>(obj: T): Array<[keyof T, T[keyof T]]>;
    }
}

export { };
