export function fromEnumToArrayOfObjects(enumForConvert: object){
  return Object.entries(enumForConvert).map(([key, value]) => ({
    key,
    value,
  }))
}