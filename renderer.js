
const fs = require("fs");

//const root = fs.readdirSync('/')

const list = document.getElementById("file-list");

const dir = "../";
let item = document.createElement("div");
let link = document.createElement("a");
let filePath = dir + "..";
item.setAttribute('class', 'directory');
link.setAttribute('href', filePath);
link.appendChild(document.createTextNode('back'));
item.appendChild(link);
list.appendChild(item);
fs.readdirSync(dir).forEach(file => {
  item = document.createElement("div");
  link = document.createElement("a");
  filePath = dir + file;
  item.setAttribute('class', fs.lstatSync(filePath).isDirectory() ? 'directory' : 'file');
  link.setAttribute('href', filePath);
  link.appendChild(document.createTextNode(file));
  item.appendChild(link);
  list.appendChild(item);
})

console.log("Hello Renderer")
//console.log(root)
