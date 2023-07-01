
import fs from 'fs';
import path from 'path'

async function Build() {
    const conf = await import(path.join(process.cwd(), 'micro.conf.js') );

    for(const microservice of conf.default.microservices) {
        const folderPath = path.join(process.cwd(), microservice.actionsPath);
        const files = fs.readdirSync(folderPath);        
        const actionsImport = []
        const actionsAction = []

        const folderPath2 = path.join(process.cwd(), microservice.paramsPath);
        const files2 = fs.readdirSync(folderPath2);  
        const paramsImport = []
        const paramsParam = []

        for(const file of files2 ) {
            const filePath = path.join(folderPath2, file);
            const fileStats = fs.statSync(filePath);
        
            if (fileStats.isFile() && path.extname(file) === '.js') {
                const fileName = path.basename(file, '.js');
                paramsImport.push(`import param_${fileName} from './${microservice.paramsPath}/${file}'`);
                paramsParam.push(`    ${fileName}: param_${fileName} `)
            }
        }


        for(const file of files ) {
            const filePath = path.join(folderPath, file);
            const fileStats = fs.statSync(filePath);
        
            if (fileStats.isFile() && path.extname(file) === '.js') {
                const fileName = path.basename(file, '.js');
                actionsImport.push(`import action_${fileName} from './${microservice.actionsPath}/${file}'`)
                const f = await import(`${filePath}`);
                const args = getArguments(f.default.toString()).map(arg => `"${arg}"`);
                args.push('action_' + fileName);
                actionsAction.push(`    ${fileName}: [${args.join(', ')}] `)
            }
        }


        

        const str = `/*
*
* Este archivo ha sido generado automáticamente NO MOVER
* ${ (new Date).toISOString() }
*/
${actionsImport.join("\n")}
${paramsImport.join("\n")}

const actions = {
${actionsAction.join(',\n')}
};

const params = {
${paramsParam.join(',\n')}
};

export default {actions, params}
            `;
        
        fs.writeFileSync( path.join(`micro.df.${microservice.name}.js`), str);
    }
}

Build();


function getArguments(functionString) {
    var argumentPattern = /(?:\s*function\s*[^\(]*)?\s*\(\s*([^)]*)\)/;
    var match = argumentPattern.exec(functionString);
    if (match && match[1]) {
      return match[1].split(',').map(function(arg) {
        return arg.trim();
      });
    }
    return [];
  }