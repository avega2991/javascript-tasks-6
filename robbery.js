'use strict';

var moment = require('./moment');

// Выбирает подходящий ближайший момент начала ограбления
module.exports.getAppropriateMoment = function (json, minDuration, workingHours) {
    var appropriateMoment = moment();

    // 1. Читаем json
    var jsonData = JSON.parse(json);
    var bankSchedule = getBankSchedule(workingHours);
    var normData = normalize(jsonData);
    var normSchedule = normalize(bankSchedule);
    // 2. Находим подходящий ближайший момент начала ограбления
    var fulltimeRange = {'from': 0, 'to': 3 * 24 * 60};
    var allBusyRanges = getBusyRanges(normData);
    var teamFreetime = substractRanges(fulltimeRange, allBusyRanges);
    var robberyTimeArray = getCompatibleTime(normSchedule['Банк'], teamFreetime);
    var robberyTime = getOptimalTime(robberyTimeArray, minDuration);
    // 3. И записываем в appropriateMoment
    var timezone = workingHours.from.slice(-2);
    appropriateMoment.date = getDate(robberyTime.from, timezone);
    appropriateMoment.timezone = timezone;
    return appropriateMoment;
};

// Возвращает статус ограбления (этот метод уже готов!)
module.exports.getStatus = function (moment, robberyMoment) {
    if (moment.date < robberyMoment.date) {
        // «До ограбления остался 1 день 6 часов 59 минут»
        return robberyMoment.fromMoment(moment);
    }

    return 'Ограбление уже идёт!';
};

function getDate(utcMinutes, timezone) {
    var daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    var dayIndex = Math.floor(utcMinutes / (24 * 60));
    var day = daysOfWeek[dayIndex];
    utcMinutes -= dayIndex * 24 * 60;
    var hour = Math.floor(utcMinutes / 60);
    utcMinutes -= hour * 60;
    hour = numberToString(hour, 2);
    utcMinutes = numberToString(utcMinutes, 2);
    return day + ' ' + hour + ':' + utcMinutes + timezone;
}

function numberToString(number, numCount) {
    --numCount;
    return number < 10 * numCount ? '0' + number : number;
}

function getBankSchedule(bankTime) {
    var days = ['ПН', 'ВТ', 'СР'];
    return {'Банк': days.map(function (dayName) {
        return {'from': dayName + ' ' + bankTime.from, 'to': dayName + ' ' + bankTime.to};
    })};
}

function normalize(data) {
    var newData = {};
    for (var personName in data) {
        var personData = data[personName];
        personData = personData.reduce(function (acc, time) {
            return acc.concat(dateRangeToUTC(time));
        },
        []);
        newData[personName] = personData;
    }
    //console.log("NEW DATA: ", newData);
    return newData;
}

function dateRangeToUTC(dateRange) {
    var newTime = {};
    newTime.from = parseToMinutesUTC(dateRange.from);
    newTime.to = parseToMinutesUTC(dateRange.to);
    return newTime;
}

function parseToMinutesUTC(time) {
    var daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    var timezone = parseInt(time.slice(-2));
    var day = daysOfWeek.indexOf(time.slice(0, 2));
    var hours = parseInt(time.slice(3, 5)) - timezone;
    var minutes = parseInt(time.slice(6, 8));

    var minutesUTC = minutes + hours * 60 + day * 24 * 60;
    return minutesUTC;
}

function substractRanges(minuend, subtraArray) {
    var result = [];
    var closestBusy = minuend;
    while (true) {
        closestBusy = minuend;
        var minFrom = minuend.to;
        var index = 0;
        var closestIndex = index;
        subtraArray.forEach(function (range) {
            if (range.from >= minuend.from && range.from < minFrom) {
                closestBusy = range;
                closestIndex = index;
                minFrom = closestBusy.from;
            }
            ++index;
        });
        if (closestBusy != minuend) {
            result.push({'from': minuend.from, 'to': closestBusy.from});
        }
        result.splice(closestIndex, 1);
        minuend.from = closestBusy.to;
        if (closestBusy.to == minuend.to) {
            break;
        }
    }
    return result;
}

function getBusyRanges(dict) {
    var result = [];
    for (var elem in dict) {
        var busyTime = dict[elem];
        busyTime.forEach(function (time) {
            result.push(time);
        });
    }
    return result;
}

function getCompatibleTime(fstData, sndData) {
    var freeTimeSpaces = [];
    fstData.forEach(function (fstRange) {
        sndData.forEach(function (sndRange) {
            if (isCompatible(fstRange, sndRange)) {
                var maxFrom = Math.max(fstRange.from, sndRange.from);
                var minTo = Math.min(fstRange.to, sndRange.to);
                freeTimeSpaces.push({'from': maxFrom, 'to': minTo});
            }
        });
    });
    return freeTimeSpaces;
}

function getOptimalTime(freetimeArray, minDuration) {
    for (var i = 0; i < freetimeArray.length; ++i) {
        var range = freetimeArray[i];
        if (range.to - range.from >= minDuration) {
            return range;
        }
    }
    return [];
}

function isCompatible(first, second) {
    return first.to >= second.from && second.to >= first.from;
}
