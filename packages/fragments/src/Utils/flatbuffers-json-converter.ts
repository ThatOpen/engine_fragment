/**
 * Recursively converts a Flatbuffers object into a plain JavaScript object.
 * This function traverses the prototype chain of the Flatbuffers object and extracts all properties
 * and their values, handling both primitive values and nested objects/arrays.
 *
 * @param obj - The Flatbuffers object to convert
 * @param result - The target plain JavaScript object where the converted properties will be stored
 *
 */
export function getObject(obj: any, result: any) {
  const proto = Object.getPrototypeOf(obj);
  const propNames = Object.getOwnPropertyNames(proto);

  for (const name of propNames) {
    if (name === "constructor" || name === "__init") continue;

    if (name.includes("mutate_")) continue;
    if (name.match(/.*Array$/)) continue;

    const value = proto[name];

    if (typeof value === "function") {
      const isArray =
        obj[`${name}Length`] !== undefined && obj[`${name}Array`] !== undefined;
      if (value.length === 2 || isArray) {
        // This is an array
        const lengthName = `${name}Length`;
        const length = obj[lengthName]();
        const array: any[] = [];
        result[name] = array;
        for (let i = 0; i < length; i++) {
          const found = obj[name](i);
          if (typeof found === "object" && found !== null && "bb" in found) {
            const object: any = {};
            getObject(found, object);
            array.push(object);
          } else {
            array.push(found);
          }
        }
        continue;
      }

      const found = obj[name]();

      if (typeof found !== "object" || found === null) {
        // console.log(name, found);
        result[name] = found;
        continue;
      }

      result[name] = {};
      getObject(found, result[name]);
    } else {
      // console.log(name, value);
      result[name] = value;
    }
  }
}
