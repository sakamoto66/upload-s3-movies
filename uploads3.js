const fs = require('fs');
const path = require('path');
const glob = require("glob");
const { spawn, exec } = require('child_process')
require('date-utils');

function createConcatFileList(dir) {
  const fileList = `${dir}/files.txt`
  const files = glob.sync(`*.MP4`, {cwd:dir})
  const stream = fs.createWriteStream(fileList)
  files.forEach(file => stream.write(`file ${file}\n`))
  stream.close()
  return fileList
}

exports.getMovieDirs = function (targetDir) {
  const dirs = glob.sync( `*/`, {cwd:targetDir, absolute:true} )
  return dirs.filter(dir => ! fs.existsSync( `${dir}/files.txt` ) && 0 < glob.sync( `${dir}/*.[Mm][Pp]4` ).length)
}

exports.getParameters = function (dir, s3path) {
  const movies = glob.sync(`*.[Mm][Pp]4`, {cwd:dir})

  const fileList = `${dir}/files.txt`
  const stream = fs.createWriteStream(fileList)
  movies.forEach(file => stream.write(`file ${file}\n`))
  stream.close()

  const ret = movies.map(file => createCommandParam(dir, file, s3path))
  ret.push(createCommandParam(dir, 'files.txt', s3path))

  return ret
}

function createCommandParam(dir, file, s3path) {
  const localPath = `${dir}/${file}`
  const s3Path = `s3://${s3path}/${path.basename(dir)}/${file}`
  const param = []
  param.push('s3')
  param.push('cp')
  param.push(localPath)
  param.push(s3Path)
  return param
}

exports.upload = function (dir, param) {
  const LOG = `${dir}/upload.log`  
  function log(msg) {
    const now = new Date().toFormat("YYYY/MM/DD HH24:MI:SS")
    msg.split("\n").forEach(line => {
      fs.appendFileSync(LOG, `${now} ${line}\n`)
    })
  }

  return new Promise(function (resolve, reject) {
    const s3Path = param[param.length-1]
    log(`start ${s3Path}`)
    const proc = spawn('aws', param)
    proc.stdout.on('data', (chunk) => console.log(chunk.toString()))
    proc.stderr.on('data', (chunk) => console.log(chunk.toString()))
  
    proc.on('close', (code) => {
      log(`close ${s3Path}`)
      resolve(code);
    })
    process.on('error', function (err) {
      log(`error ${s3Path}`)
      reject(err);
    })
  })
}
