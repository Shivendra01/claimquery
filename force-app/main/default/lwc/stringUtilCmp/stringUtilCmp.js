/**************************************************************************
* Created by Slava Yakovlev on 09/07/2021
* Description: Utility to hold string common functions. 
**************************************************************************/

// check if a givien string is blank
var  stringIsBlank = (str) =>{
    if(str && str!=null && str.length>0){
        return false;
    }
    return true;
}

// check if a givien string is not blank
var  stringIsNotBlank = (str) =>{
    if(str && str!=null && str.length>0){
        return true;
    }
    return false;
}

var safeSplit = (str, sep) => {
    if (!str || !sep || typeof str !== 'string') {
        return '';
    }
    return str.split(sep).map(item=>item.trim());
}

export { stringIsBlank, stringIsNotBlank, safeSplit };