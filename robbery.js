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
    var fulltimeRange = [];
    fulltimeRange.push({from: 0, to: 3 * 24 * 60});
    var allBusyRanges = getBusyRanges(normData);
    var teamFreetime = substractRanges(fulltimeRange, allBusyRanges);
    var robberyTimeArray = getCompatibleTime(normSchedule['Банк'], teamFreetime);
    var robberyTime = getOptimalTime(robberyTimeArray, minDuration, normSchedule['Банк']);

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
        return {from: dayName + ' ' + bankTime.from, to: dayName + ' ' + bankTime.to};
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
    return newData;
}

function dateRangeToUTC(dateRange) {
    return {from: parseToMinutesUTC(dateRange.from), to: parseToMinutesUTC(dateRange.to)};
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

function substractRanges(minuendArray, subtraArray) {
    subtraArray.forEach(function (subtrahend) {
        var index = 0;
        minuendArray.forEach(function (minuend) {
            if (isCompatible(minuend, subtrahend)) {
                var intersection = getIntersection(minuend, subtrahend);
                if (minuend.from != intersection.from) {
                    // left
                    minuendArray.push({from: minuend.from, to: intersection.from});
                }
                if (minuend.to != intersection.end) {
                    // right
                    minuendArray.push({from: intersection.to, to: minuend.to});
                }
                minuendArray.splice(index, 1);
            }
            ++index;
        });
    });
    return minuendArray.filter(function (elem) {
        return elem.from != elem.to;
    });
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
                freeTimeSpaces.push(getIntersection(fstRange, sndRange));
            }
        });
    });
    return freeTimeSpaces.filter(function (range) {
        return range.from != range.to;
    });
}

function getOptimalTime(freetimeArray, minDuration, workingHours) {
    freetimeArray = freetimeArray.map(function (range) {
        for (var index in workingHours) {
            var bankRange = workingHours[index];
            if (isCompatible(range, bankRange)) {
                return getIntersection(range, bankRange);
            }
        }
        return {};
    });
    for (var index in freetimeArray) {
        var range = freetimeArray[index];
        if (range.to - range.from >= minDuration) {
            return range;
        }
    }
    return [];
}

function getIntersection(fstRange, sndRange) {
    var maxFrom = Math.max(fstRange.from, sndRange.from);
    var minTo = Math.min(fstRange.to, sndRange.to);
    return {from: maxFrom, to: minTo};
}

function isCompatible(first, second) {
    return first.to >= second.from && second.to >= first.from;
}
