const getOpenId = require('./getOpenId/index');
const getMiniProgramCode = require('./getMiniProgramCode/index');
const createCollection = require('./createCollection/index');
const selectRecord = require('./selectRecord/index');
const updateRecord = require('./updateRecord/index');
const sumRecord = require('./sumRecord/index');
const fetchGoodsList = require('./fetchGoodsList/index');
const genMpQrcode = require('./genMpQrcode/index');
const listHomeJpg = require('./listHomeJpg/index');
const listMusicImage = require('./listMusicImage/index');
const getphonenumber = require('./getphonenumber/index');
const login = require('./login/index');
const generateQrCode = require('./generateQrCode/index');
const createOrder = require('./createOrder/index');
const fetchUserOrders = require('./fetchUserOrders/index');
const getImages = require('./getImages/index');
const getSound = require('./getSound/index');

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case 'getOpenId':
      return await getOpenId.main(event, context);
    case 'getMiniProgramCode':
      return await getMiniProgramCode.main(event, context);
    case 'createCollection':
      return await createCollection.main(event, context);
    case 'selectRecord':
      return await selectRecord.main(event, context);
    case 'updateRecord':
      return await updateRecord.main(event, context);
    case 'sumRecord':
      return await sumRecord.main(event, context);
    case 'fetchGoodsList':
      return await fetchGoodsList.main(event, context);
    case 'genMpQrcode':
      return await genMpQrcode.main(event, context);
    case 'listHomeJpg':
      return await listHomeJpg.main(event, context);
    case 'listMusicImage':
      return await listMusicImage.main(event, context);
    case 'getphonenumber':
      return await getphonenumber.main(event, context);
    case 'login':
      return await login.main(event, context);
    case 'generateQrCode':
      return await generateQrCode.main(event, context);
    case 'createOrder':
      return await createOrder.main(event, context);
    case 'fetchUserOrders':
      return await fetchUserOrders.main(event, context);
    case 'getImages':
      return await getImages.main(event, context);
    case 'getSound':
      return await getSound.main(event, context);
  }
};
        
