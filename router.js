const router = require('express').Router();
const moment = require('moment');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const zip = require('express-zip');
const archiver = require('archiver');
const FileType = require('file-type');
let iconFiles = [];

fs.readdir(path.resolve('./client/icons'), (err, files) => {
    if (err) throw err;
    files.forEach(file => {
        iconFiles.push(file.split('.')[0]);
    });
});

handlebars.registerHelper('formatDate', (dateString) => new handlebars.SafeString(
  moment(dateString).tz(process.env.TIMEZONE).format('dddd, MMMM Do YYYY, h:mm:ss a'),
));
handlebars.registerHelper('decToPrecent', (decString) => new handlebars.SafeString(
  `${Number((decString * 100).toFixed(2))}%`,
));
handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});
handlebars.registerHelper('ifBoth', function (arg1, arg2, options) {
  return (arg1 && arg2) ? options.fn(this) : options.inverse(this);
});
handlebars.registerHelper('ifEither', function (arg1, arg2, options) {
  return (arg1 || arg2) ? options.fn(this) : options.inverse(this);
});
handlebars.registerHelper('nameAbriviation', function (_name) {
  let name = '';
  _name.split(' ').forEach((i) => {name += i[0]});
  return name;
});
handlebars.registerHelper({
  eq: (v1, v2) => v1 === v2,
  ne: (v1, v2) => v1 !== v2,
  lt: (v1, v2) => v1 < v2,
  gt: (v1, v2) => v1 > v2,
  lte: (v1, v2) => v1 <= v2,
  gte: (v1, v2) => v1 >= v2,
  and() {
    return Array.prototype.every.call(arguments, Boolean);
  },
  or() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  },
});
handlebars.registerHelper('showFiles', (fileObj) => {
  let mapFiles = (_fileObj, depth = 1, filePath = '/') => {
    let str = '';
    let style = `min-width: 25px; min-height: 25px; margin: auto 2px;`
    for (let i = 0; i < Object.keys(_fileObj).length; i++) {
      if (Array.isArray(_fileObj[Object.keys(_fileObj)[i]])) {
        str += `<div style="margin-left: 5%;">`
        str += `<div style="display: flex">`
        str += `<div style="${style} background: url(/icon/folder-base.svg);" id="${Object.keys(_fileObj)[i]}-icon";></div>`;
        str += `<div style="${style}" class="dropfolder" onclick="show('${Object.keys(_fileObj)[i]}')">${Object.keys(_fileObj)[i]}</div>`;
        str += `</div>`;
        str += `<div class="folder" id="${Object.keys(_fileObj)[i]}">`;
        str += mapFiles(_fileObj[Object.keys(_fileObj)[i]], depth + 1, `${filePath}${Object.keys(_fileObj)[i]}/`);
        str += `</div>`;
        str += `</div>`;
      } else {
        str += `<div style="margin-left: 5%; display: flex;">`
        _fileObj[Object.keys(_fileObj)[i]].split('.').some((e) => iconFiles.includes(e));
        if (_fileObj[Object.keys(_fileObj)[i]].split('.').some((e) => iconFiles.includes(e))) {
          let name;
          for (let j = _fileObj[Object.keys(_fileObj)[i]].split('.').length; j >= 0; j--) {
            if (iconFiles.includes(_fileObj[Object.keys(_fileObj)[i]].split('.')[j])) {
              name = _fileObj[Object.keys(_fileObj)[i]].split('.')[j];
              break;
            }
          }
          str += `<div style="${style} background: url(/icon/${name}.svg);"></div>`;
        } else {
          str += `<div style="${style} background: url(/icon/document.svg);"></div>`;
        }
        str += `<div class="file" onclick="getFile('${filePath}${_fileObj[Object.keys(_fileObj)[i]]}')">${_fileObj[Object.keys(_fileObj)[i]]}</div>`;
        str += `</div>`
      }
    }
    return str;
  };
  return mapFiles(fileObj);
});

router.get('/', async (req, res) => {
  res.redirect(301, '/projects');
});

router.get('/projects', async (req, res) => {
  const template = handlebars.compile(fs.readFileSync(path.resolve('./client/projects.hbs')).toString());
  res.send(template({}));
});

router.get('/projects/:id', async (req, res) => {
  let structure = {};
    const getAllFiles = function(dirPath, filesObj) {
    files = fs.readdirSync(dirPath)

    filesObj = filesObj || [];

    files.forEach(function(file) {
      if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        filesObj[file] = getAllFiles(dirPath + "/" + file, filesObj[file])
      } else {
        filesObj.push(file)
      }
    })

    return filesObj
  }
  const template = handlebars.compile(fs.readFileSync(path.resolve('./client/projectView.hbs')).toString());
  res.send(template({folders: getAllFiles(`./projects/${req.params.id}`)}));
});

router.get('/projects/:id/get/file', async (req, res) => {
  if (req.query.filepath) {
    fs.readFile(`./projects/${req.params.id}${req.query.filepath}`, (err, data) => {
      if (err) {
        res.sendStatus(500);
        console.error(err);
        return;
      }
      res.send(data);
    });
  } else {
    res.sendStatus(400);
  }
});

router.get('/projects/:id/download',function(req,res){
  let archive = archiver('zip');
  archive.pipe(fs.createWriteStream(`${req.params.id}.zip`));
  archive.directory(`./projects/${req.params.id}`, false);
  archive.on('end', function() {
    console.log('Archive wrote %d bytes', archive.pointer());
    res.download(`./${req.params.id}.zip`);
  });
  archive.finalize();
});

router.get('/icon/:icon', async (req, res) => {
  res.sendFile(path.resolve(`./client/icons/${req.params.icon}`));
});

// router.get('/login', async (req, res) => {
//   if (req.session.user) {
//     if (req.query.redirect) {
//       res.redirect(301, req.query.redirect);
//     } else {
//       res.redirect(301, '/channels/@me');
//     }
//   } else {
//     const template = handlebars.compile(fs.readFileSync(path.resolve('views/hbs/login.hbs')).toString());
//     res.send(template({
//       redirect: (req.query.redirect ? req.query.redirect : '/channels/@me'),
//     }));
//   }
// });

// router.get('/favicon.ico', async (req, res) => {
//   res.sendFile(path.resolve(__dirname, '../views/img/favicon.ico'));
// });

module.exports = router;
