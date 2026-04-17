export const createSetStateAction = (keychain: (string | number | undefined)[], value: any) => {
    return (prev: any) => {
        let copy = Array.isArray(prev) ? [...prev] : {...prev};
        let c = copy
        for (let i = 0; i < keychain.length-1; i++) {
            const a = c[keychain[i]]
            c[keychain[i]] = Array.isArray(a) ? [...a] : {...a};
            c=c[keychain[i]]
        }

        if (keychain[keychain.length-1] === undefined) c.push(value)
        else if(value !== undefined) c[keychain[keychain.length-1]] = value
        else if(Array.isArray(c)) c.splice(keychain[keychain.length-1] as number, 1)
        else delete c[keychain[keychain.length-1]]
        
        return copy
    }
}