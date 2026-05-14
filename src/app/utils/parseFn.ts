export function getFn(fn:string): Function | null {
  try {
    let func;
    eval('func = '+fn)
    if (typeof func !== 'function') throw new Error('invalid function')
    return func
  } catch {
    return null
  }
}