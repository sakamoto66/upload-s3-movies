const fs = require('fs');
const uploads3  = require('./uploads3.js');
require('date-utils');

(async () => {
  const target_dir = process.argv[2]
  const s3path = process.argv[3]
  const lockfile = `${target_dir}/make.now`

  if( fs.existsSync(lockfile)) {
    return;
  }
  fs.writeFileSync(lockfile, new Date().toFormat("YYYY/MM/DD HH24:MI:SS"))
  const dirList = uploads3.getMovieDirs(target_dir)
  for(let dir of dirList) {
    try {
      console.log(dir)
      const params = uploads3.getParameters(dir, s3path)
      for(pm of params) {
        await uploads3.upload(dir, pm)
      }
    }catch(e) {
      console.log(e)
    }
  }
  fs.unlinkSync(lockfile)
})()