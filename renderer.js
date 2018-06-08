
const fs = require("fs");

//const root = fs.readdirSync('/')

const list = document.getElementById("file-list");

const dir = "/users/kirtan/desktop/"

fs.readdirSync(dir).forEach(file => {
  let item = document.createElement("div");
  item.setAttribute('class', fs.lstatSync(dir + file).isDirectory() ? "directory" : "file");
  item.appendChild(document.createTextNode(file));
  list.appendChild(item);
})

console.log("Hello Renderer")
//console.log(root)
