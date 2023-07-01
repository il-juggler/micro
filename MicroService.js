export function MicroService(Settings) {
    const Actions = new Map();

    //Crear las acciones correspondientes
    Object.keys(Settings.actions).forEach(aname => {
        Actions.set(aname, CreateAction(Settings.actions[aname], Settings))
    });

    function getAction(actionName) {
        if(!Actions.get(actionName)) {
            throw new Error(`Accion no definida ${actionName}`);
        }
        return Actions.get(actionName);
    }
   
    async function invoke (req, res) {
        const actionName = req.params.actionName;
        try {
            const action        = getAction(actionName);
            const actionContext = {isMiddleware: true, req, res, params:{}, input:req.body};
            const result        = await action.execute(actionContext);

            res.send({result});

        } catch (e) {
            res.status(500)
            res.send({err : e.message})
        }
    }

    return {invoke, getAction}
}



function CreateAction(ActionDescr, Settings) {
    const actionArguments = ActionDescr;
    const actionFunction = ActionDescr.pop();

    async function BuildArguments(input, context) {
        return asyncMap(actionArguments, async (argName) => await ProcessArg(argName, input, context));
    }

    async function ProcessArg(argName, input, context) {
        const argDescr = Settings.params[argName];
        if(!argDescr) throw new Error(`Argumento no definido (${argName}).`);

        //Se convierte el procesador de argumentos a un array en el caso de que no lo sea
        const argumentDescriptor = Array.isArray(argDescr) || [argDescr]

        //Se procesa el parámetro de forma secuencial
        let value = input[argName];
        await asyncMap(argumentDescriptor, async (argdesc) => {
            value = await argdesc.apply(context, [value, input]);
        }); 

        //Se asigna el valor final al contexto
        context.params[argName] = value;

        //Se retorna el valor
        return context.params[argName]
    }
    
    async function execute(context) {
        // Se procesan uno a uno los argumentos
        const localArguments = await BuildArguments(context.input);
        return actionFunction.apply(context, localArguments);
    };


    return {execute};
}

async function asyncMap(array, actionFn) {
    const returnArray = [];
    for(const [index, element] of array.entries()) {
        returnArray.push(await actionFn(element, index));
    }
    return returnArray;
}   
