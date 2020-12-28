'use strict';

const role = {
    ADMIN:'Admin',
    RAW_MATERIALS_STORE:'RawMaterialsStore',
    PRODUCER:'Producer',
    CUSTOMER:'Customer',
    SHIPPER:'Shipper',
    MAINTAINER:'Maintainer',
    PRODUCT_STORE:'ProductStore',
    REGULATOR:'Regulator'
};

const accountName = {
    ADMIN: 'admin',
}
const accountPassword={
    ADMIN: 'adminpw',

}

module.exports.role = role;
module.exports.accountName = accountName;
module.exports.accountPassword = accountPassword;
