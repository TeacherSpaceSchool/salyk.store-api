const Jimp = require('jimp');
const randomstring = require('randomstring');
const app = require('../app');
const fs = require('fs');
const path = require('path');
const urlMain = `${process.env.URL.trim()}:3000`
module.exports.urlMain = urlMain
module.exports.skip = 1
module.exports.cashierMaxDay = 365

module.exports.validMail = (mail) => {
    return /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()\.,;\s@\"]+\.{0,1})+([^<>()\.,;:\s@\"]{2,}|[\d\.]+))$/.test(mail);
}
module.exports.validPhone = (phone) => {
    return /^[+]{1}996[0-9]{9}$/.test(phone);
}
module.exports.weekDay = [
    'BC',
    'ПН',
    'ВТ',
    'СР',
    'ЧТ',
    'ПТ',
    'СБ',
]
module.exports.month = [
    'январь',
    'февраль',
    'март',
    'апрель',
    'май',
    'июнь',
    'июль',
    'август',
    'сентябрь',
    'октябрь',
    'ноябрь',
    'декабрь'
]

module.exports.statsCollection = async (collection) => {
    return (await (require(collection)).collection.stats())
}

module.exports.checkInt = (int) => {
    return isNaN(parseInt(int))?0:parseInt(int)
}

module.exports.checkFloat = (float) => {
    float = parseFloat(float)
    return isNaN(float)?0:Math.round(float * 100)/100
}

module.exports.saveFile = (stream, filename) => {
    return new Promise((resolve) => {
        filename = `${randomstring.generate(7)}${filename}`;
        let filepath = path.join(app.dirname, 'public', 'files', filename)
        let fstream = fs.createWriteStream(filepath);
        stream.pipe(fstream)
        fstream.on('finish', async () => {
            resolve(`/files/${filename}`)
        })
    })
}

module.exports.types = ['товары', 'услуги']

module.exports.checkDate = (date) => {
    date = new Date(date)
    return date=='Invalid Date'?new Date():date
}

module.exports.saveImage = (stream, filename) => {
    return new Promise(async (resolve) => {
        let randomfilename = `${randomstring.generate(7)}${filename}`;
        let filepath = path.join(app.dirname, 'public', 'images', randomfilename)
        let fstream = fs.createWriteStream(filepath);
        stream.pipe(fstream)
        fstream.on('finish', async () => {
            let image = await Jimp.read(filepath)
            if(image.bitmap.width>800||image.bitmap.height>800) {
                randomfilename = `${randomstring.generate(7)}${filename}`;
                let filepathResize = path.join(app.dirname, 'public', 'images', randomfilename)
                image.resize(800, Jimp.AUTO)
                    .quality(80)
                    .write(filepathResize);
                fs.unlink(filepath, ()=>{
                    resolve(`/images/${randomfilename}`)
                })
            }
            else
                resolve(`/images/${randomfilename}`)
        })
    })
}

module.exports.deleteFile = (oldFile) => {
    return new Promise((resolve) => {
        oldFile = oldFile.replace(urlMain, '')
        oldFile = path.join(app.dirname, 'public', oldFile)
        fs.unlink(oldFile, ()=>{
            resolve()
        })
    })
}
module.exports.pdDDMMYYYY = (date) =>
{
    date = new Date(date)
    date = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()}`
    return date
}
module.exports.pdDDMMYYHHMM = (date) =>
{
    date = new Date(date)
    date = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getYear()-100} ${date.getHours()<10?'0':''}${date.getHours()}:${date.getMinutes()<10?'0':''}${date.getMinutes()}`
    return date
}
module.exports.pdDDMMYYYYHHMM = (date) =>
{
    date = new Date(date)
    date = `${date.getDate()<10?'0':''}${date.getDate()}.${date.getMonth()<9?'0':''}${date.getMonth()+1}.${date.getFullYear()} ${date.getHours()<10?'0':''}${date.getHours()}:${date.getMinutes()<10?'0':''}${date.getMinutes()}`
    return date
}
module.exports.pdKKM = (date) =>
{
    date = new Date(date)
    date = `${date.getFullYear()}-${date.getMonth()<9?'0':''}${date.getMonth()+1}-${date.getDate()<10?'0':''}${date.getDate()}T${date.getHours()<10?'0':''}${date.getHours()}:${date.getMinutes()<10?'0':''}${date.getMinutes()}:${date.getSeconds()<10?'0':''}${date.getSeconds()}.000+06:00`
    return date
}
module.exports.pdQRKKM = (date) =>
{
    date = new Date(date)
    date = `${date.getFullYear()}-${date.getMonth()<9?'0':''}${date.getMonth()+1}-${date.getDate()<10?'0':''}${date.getDate()}_${date.getHours()<10?'0':''}${date.getHours()}:${date.getMinutes()<10?'0':''}${date.getMinutes()}:${date.getSeconds()<10?'0':''}${date.getSeconds()}`
    return date
}
module.exports.psDDMMYYYYHHMM = (string) =>
{
    let date = new Date()
    string = string.split(' ')
    string[0] = string[0].split('.')
    string[1] = string[1].split(':')
    date.setDate(string[0][0])
    date.setMonth(string[0][1]-1)
    date.setYear(string[0][2])
    date.setHours(string[1][0])
    date.setMinutes(string[1][1])
    return date
}

module.exports.pdHHMM = (date) =>
{
    date = new Date(date)
    date = `${date.getHours()<10?'0':''}${date.getHours()}:${date.getMinutes()<10?'0':''}${date.getMinutes()}`
    return date
}

module.exports.pTypes = [
    'Автомобильная заправочная станция (АЗС)',
    'Автомобильная газонаполнительная компрессорная станция (АГНКС)',
    'Автомобильная газозаправочная станция (АГЗС)',
    'Магазин (с торговой площадью более 200 кв.м.)',
    'Магазин (с торговой площадью от 100 до 200 кв.м.)',
    'Магазин (с торговой площадью от 50 до 100 кв.м.)',
    'Магазин (с торговой площадью до 50 кв.м.)',
    'Медицинская лаборатория, в т.ч. УЗИ',
    'Медицинский центр (с площадью свыше 150 кв.м.)',
    'Медицинский центр (с площадью до 150 кв.м.)',
    'Кафе/Ресторан/Чайхана и т.д. (с количеством посадочных мест более 200 кв.м.)',
    'Кафе/Ресторан/Чайхана и т.д. (с количеством посадочных мест от 100 до 200 кв.м.)',
    'Кафе/Ресторан/Чайхана и т.д. (с количеством посадочных мест до 100 кв.м.)',
    'Сеть быстрого питания (фаст-фуд)',
    'Бутик/Отдел/Магазин, расположенный в ТЦ (с торговой площадью более 200 кв.м.)',
    'Бутик/Отдел/Магазин, расположенный в ТЦ (с торговой площадью от 100 до 200 кв.м.)',
    'Бутик/Отдел/Магазин, расположенный в ТЦ (с торговой площадью от 50 до 100 кв.м.)',
    'Бутик/Отдел/Магазин, расположенный в ТЦ (с торговой площадью до 50 кв.м.)',
    'Ветеринарная клиника',
    'Ветеринарная аптека',
    'Аптека',
    'Аптечный пункт',
    'Платежный терминал',
    'Вендинговый аппарат',
    'Сауна',
    'Баня',
    'Бильярдный клуб',
    'Обменное бюро',
    'Дискотека/Ночной клуб',
    'Караоке',
    'Круглосуточная автостоянка',
    'Ломбард',
    'Парикмахерская/Салон красоты',
    'Стоматология',
    'Аренда рекламных щитов',
    'Мойка автотранспортных средств',
    'Гостиница',
    'Дом отдыха',
    'Частный коттедж',
    'СТО ',
    'Вулканизация',
    'Нотариус/Адвокатская контора',
    'КОУ (пансионаты, санатории, лагеря и т.п.)',
    'Павильон/Контейнер/Киоск (с площадью более 50 кв.м.)',
    'Авиакасса',
    'Бассейн',
    'Образовательное учреждение (садик, школа, ВУЗ и т.п.)',
    'Интернет клуб',
    'Игровой клуб (игровые приставки)',
    'Кинотеатр',
    'Химчистка',
    'Спортивный зал (фитнес клуб, зал единоборства и т.п.)',
    'Фотосалон',
    'Свадебный салон',
    'Звукозапись',
    'Спортивное поле (футбольное, теннисное, волейбольное и т.п.)',
    'Цирк',
    'Аттракцион',
    'Боулинг',
    'Другие точки торговли',
    'Другие точки оказания услуг',
    'Айыл окмоту',
    'Прочее'
]

module.exports.bTypes = [
    'Розничная торговля широким ассортиментом товаров, в т.ч. продовольственными товарами',
    'Розничная торговля горюче-смазочными материалами',
    'Розничная торговля автомобильным газом',
    'Розничная торговля авиабилетами',
    'Розничная торговля ветеринарными препаратами',
    'Розничная торговля фармацевтическими товарами ',
    'Розничная торговля медицинскими и ортопедическими товарами',
    'Розничная торговля мясом и мясными продуктами',
    'Розничная торговля рыбой, ракообразными и моллюсками',
    'Розничная торговля хлебом, хлебобулочными изделиями, мучными и кондитерскими изделиями из сахара',
    'Розничная торговля алкогольными и неалкогольными напитками',
    'Розничная торговля табачными изделиями',
    'Розничная торговля компьютерами и программным обеспечением',
    'Розничная торговля аудио- и видеоаппаратурой',
    'Розничная торговля бытовыми электротоварами',
    'Розничная торговля текстильными изделиями',
    'Розничная торговля строительными материалами',
    'Розничная торговля коврами и ковровыми изделиями',
    'Розничная торговля мебелью',
    'Розничная торговля осветительными приборами и прочими бытовыми товарами',
    'Розничная торговля книгами',
    'Розничная торговля журналами и канцелярскими товарами',
    'Розничная торговля видео и музыкальными записями (DVD-дисками, видеокассетами, компакт-дисками и т.п.)',
    'Розничная торговля спортивными товарами',
    'Розничная торговля играми и игрушками',
    'Розничная торговля одеждой',
    'Розничная торговля обувью',
    'Розничная торговля косметическими и парфюмерными товарами',
    'Розничная торговля цветами и другими растениями, семенами, удобрениями',
    'Розничная торговля домашними животными (питомцами)',
    'Розничная торговля кормом для животных',
    'Розничная торговля часами и ювелирными изделиями',
    'Розничная торговля запасными частями и материалами к автомобилям',
    'Розничная торговля прочими продовольственными товарами',
    'Розничная торговля прочими непродовольственными товарами',
    'Услуги медицинских лабораторий, в т.ч. УЗИ',
    'Услуги медицинских центров',
    'Услуги общественного питания',
    'Услуги сети быстрого питания (фаст-фуд)',
    'Услуги ветеринаров',
    'Услуги платежных терминалов',
    'Услуги вендинговых аппаратов',
    'Услуги саун',
    'Услуги бань',
    'Услуги бильярдных клубов',
    'Услуги обменных бюро',
    'Услуги дискотек/ночных клубов',
    'Услуги круглосуточных автостоянок',
    'Услуги ломбардов',
    'Услуги парикмахерских и салонов красоты',
    'Услуги стоматологий',
    'Услуги аренды рекламных щитов',
    'Услуги моек автотранспортных средств',
    'Услуги гостиниц, домов отдыхов, частных коттеджей',
    'Услуги технического обслуживания и ремонта автомобилей',
    'Услуги вулканизаций',
    'Услуги нотариусов/адвокатских контор',
    'Услуги КОУ (пансионаты, санатории, лагеря и т.п.)',
    'Услуги бассейнов',
    'Услуги образовательных учреждений (садик, школа, ВУЗ и т.п.)',
    'Услуги интернет клубов',
    'Услуги игровых клубов (игровые приставки)',
    'Услуги кинотеатров',
    'Услуги химчистки',
    'Услуги спортивных залов (фитнес клуб, зал единоборства и т.п.)',
    'Услуги фотосалонов',
    'Услуги спортивных полей (футбольное, теннисное, волейбольное и т.п.)',
    'Услуги цирка',
    'Услуги аттракционов',
    'Услуги боулингов',
    'Услуги звукозаписи',
    'Услуги видеосъемок',
    'Услуги свадебных салонов',
    'Услуги спортивных полей (футбол, баскетбол, волейбол, теннис) ',
    'Услуги аттракционов',
    'Услуги караоке',
    'Оказание прочих услуг',
    'Сбор с населения платежей',
    'Реализация запасных частей и материалов к автомобилям (новых и бывших в употреблении):',
    'реализация сотовых телефонов, запасных частей и деталей к ней с правом привлечения не более 1-го наемного работника',
    'Скупка, ремонт и реализация изделий из драгоценных металлов и камней',
    'Розничная реализация в специализированных магазинах, овощей, фруктов, ягод и других видов растениеводства в натуральном или переработанном виде',
    'Розничная реализация в специализированных магазинах, торговой площадью до 50 кв.м, товаров, инвентаря и снастей охотнично-промыслового назначения (за исключением оружия) и рыболовства',
    'Розничная реализация в специализированных магазинах, торговой площадью до 50 кв.м, мыломоющих средств и парфюмерно-косметических изделий',
    'Розничная реализация на дому газовых баллонов, угля в мешках и дров',
    'Изготовление и реализация готовых мясных блюд из мяса и мяса птиц (шашлык, гриль)',
    'Производство хлеба, хлебобулочных и мучных кондитерских изделий недлительного хранения',
    'Производство пескоблока, шлакоблока и брусчаток на дому',
    'Прочее'
]

module.exports.docTypes  =  {
    'Продажа': '1',
    'Покупка': '2',
    'Возврат продажи': '3',
    'Возврат покупки': '4',
    'Аванс': '5',
    'Закрытие аванса': '6',
    'Возврат аванса': '7',
    'Кредит': '8',
    'Погашение кредита': '9',
    'Возврат кредита': '10',
}

module.exports.typePayments  =  {
    'Наличными': '1',
    'Безналичный': '2',
}

module.exports.ndsTypesKKM  =  {
    'Без НДС': '1',
    'Ставка НДС 12%': '2',
    'Ставка НДС 0%': '3',
    'Освобожденная от НДС': '4',
    'Ставка НДС 20%': '5'

}

module.exports.nspTypesKKM  =  {
    'Без НСП': '1',
    'НСП 0%': '2',
    'НСП 1%': '3',
    'НСП 2%': '4',
    'НСП 3%': '5',
    'НСП 5%': '6'


}

