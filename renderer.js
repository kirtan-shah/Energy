
const fs = require("fs");

//const root = fs.readdirSync('/')

const list = document.getElementById("file-list");

const dir = "../"

fs.readdirSync(dir).forEach(file => {
  let item = document.createElement("div");
  let filePath = dir + file
  item.setAttribute('class', fs.lstatSync(filePath).isDirectory() ? "directory" : "file");
  item.innerHTML += "<ul> <a href = " + "filePath> " + file + " </a> </ul>"
  list.appendChild(item);
})

console.log("Hello Renderer")
//console.log(root)
