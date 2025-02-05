let content = [];
const flags = {
  name: false,
  rawStr: false,
  hexStr: false,
  array: false,
  dict: false,
};

export default function parsePdfDict(rawObject) {
  console.log("\n\nPARSER\n");
  /*
    0x28 => (; 0x29 => ); 0x2f => /; 0x3c => <; 0x3e => >; 0x5b => [; 0x5d => ]
    dict: <<...>>
    string: <...> or (...)
    name: /...
    array: [...]
    */
  console.log(rawObject.toString());

  const chrMap = {
    0x28: "rawStr",
    0x29: "rawStr",
    0x2f: "name",
    0x3c: "hexStr",
    0x3e: "hexStr",
    0x5b: "array",
    0x5d: "array",
  };
  let flag = false;
  for (let chr of rawObject) {
    content.push(chr);

    if (flag) {
      if (flag == 0x3c) {
        if (chr == 0x3c) {
          console.log("<<", "dict       start");
        } else {
          console.log("< ", "hex string start");
          flag = false;
        }
      } else if (flag == 0x3e) {
        if (chr == 0x3e) {
          flags.name && theHandler("name");
          console.log(">>", "dict         end");
        } else {
          console.log("> ", "hex string   end");
          flag = false;
        }
      }
    }

    [0x0a, 0x20, 0x2f].includes(chr) && flags.name && theHandler("name");
    theHandler(chrMap[chr]);

    /*
    if (chr == 0x2f) {
      //0x2f == /name
      flags.name && theHandler("name");
      theHandler("name");
    } else if (chr == 0x5b || chr == 0x5d) {
      //0x5b, 0x5d == [array]
      theHandler("array");
    } else if (chr == 0x28 || chr == 0x29) {
      //0x28, 0x29 == (raw string)
      theHandler("rawStr");
    } else if (chr == 0x3c || chr == 0x3e) {
      //0x3c, 0x3e == <?>
      if (flag) {
        flag = false;
      } else {
        flag = chr;
      }
    }*/
  }
  console.log("\nEND PARSER\n\n");
}

function theHandler(key) {
  if (!key) {
    return;
  }
  flags[key] = !flags[key];
  console.log(
    "/ ",
    key,
    flags[key]
      ? "start: " + new Buffer.from(content).toString().slice(0, -1).trim()
      : "  end: " + new Buffer.from(content).toString().slice(0, -1),
  );
  content = [];
}
