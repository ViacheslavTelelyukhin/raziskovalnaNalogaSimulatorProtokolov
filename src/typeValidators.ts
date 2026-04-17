import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ name: 'string-or-number', async: false })
export class IsNumberOrString implements ValidatorConstraintInterface {
  validate(text: any, args: ValidationArguments) {
    return typeof text === 'number' || typeof text === 'string';
  }

  defaultMessage(args: ValidationArguments) {
    return '($value) must be number or string';
  }
}

@ValidatorConstraint({ name: 'string-or-number', async: false })
export class IsStringEnumRecord implements ValidatorConstraintInterface {
  validate(text: any, args: ValidationArguments) {
    const entries = Object.entries(text)
    const enumObjectKeysAll = Object.keys(args.constraints[0])
    const enumObjectValues = enumObjectKeysAll.slice(0, enumObjectKeysAll.length/2)
    
    for (let i = 0; i < entries.length; i++) {
      if (typeof entries[i][0] !== 'string') return false
      if (!enumObjectValues.includes(entries[i][1].toString())) return false
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return '($value) must be an object with string keys and enum values';
  }
}

@ValidatorConstraint({ name: 'string-or-number', async: false })
export class IsFunction implements ValidatorConstraintInterface {
  validate(text: any, args: ValidationArguments) {
    if (Array.isArray(text)) {for (let i = 0; i < text.length; i++) if(!checkFn) return false}
    else if(!checkFn(text)) return false
    
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return '($value) must be an object with string keys and enum values';
  }
}

function checkFn(fn:string) {
  try {
    let func;
    eval('func = '+fn)
    if (typeof func !== 'function') throw new Error('invalid function')
  } catch {
    return false
  }
}