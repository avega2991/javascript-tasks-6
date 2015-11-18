'use strict';

var dayMinutes = 24 * 60;
var hourRegex = /([0-9]{2}:[0-9]{2})/;

module.exports = function () {
    return {
        // Здесь как-то хранится дата ;)
        _date: null,

        get date() {
            return this._date;
        },

        set date(dateData) {
            this._date = module.exports.parseToMinutesUTC(dateData);
        },

        // А здесь часовой пояс
        timezone: null,

        // Выводит дату в переданном формате
        format: function (pattern) {
            var days = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
            var dayIndex = Math.floor(this.date / dayMinutes);
            var time = this.date - dayIndex * dayMinutes;
            if (time + this.timezone * 60 < 0) {
                dayIndex = dayIndex <= 0 ? days.length - 1 : dayIndex - 1;
                time += dayMinutes;
            }
            var day = days[dayIndex];
            var result = pattern.replace('%DD', day);
            result = result.replace('%HH:%MM', getTime(time, this.timezone));
            return result;
        },

        // Возвращает кол-во времени между текущей датой и переданной `moment`
        // в человекопонятном виде
        fromMoment: function (moment) {
            var verbose = declineWord(2, ['остался', 'осталось', 'осталось']) + ' ';
            var days = '';
            var hours = '';
            var minutes = '';
            var diff = this.date - moment.date;
            var daysCount = parseInt(diff / dayMinutes);
            if (daysCount >= 1) {
                diff -= daysCount * dayMinutes;
                verbose = declineWord(daysCount, ['остался', 'осталось', 'осталось']) + ' ';
                days = daysCount + ' ';
                days += declineWord(daysCount, ['день', 'дня', 'дней']) + ' ';
            }
            var hoursCount = parseInt(diff / 60);
            if (hoursCount >= 1) {
                diff -= hoursCount * 60;
                hours = hoursCount + ' ';
                hours += declineWord(hoursCount, ['час', 'часа', 'часов']) + ' ';
            }
            var minutesCount = parseInt(diff);
            if (minutesCount != 0) {
                minutes = minutesCount + ' ';
                minutes += declineWord(minutesCount, ['минута', 'минуты', 'минут']) + ' ';
            }
            return 'До ограбления ' + verbose + days + hours + minutes;
        }
    };
};

module.exports.parseToMinutesUTC = function (time) {
    if (!isNaN(parseInt(time))) {
        return time;
    }
    var daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
    var timezone = parseInt(time.slice(-2));
    var day = daysOfWeek.indexOf(time.slice(0, 2));
    var hours = parseInt(time.slice(3, 5)) - timezone;
    var minutes = parseInt(time.slice(6, 8));

    var minutesUTC = minutes + hours * 60 + day * dayMinutes;
    return minutesUTC;
};

function getTime(time, timezone) {
    var hour = time / 60;
    var minutes = time - hour * 60;
    var timezoneHours = hour + timezone;
    return numberToString(timezoneHours, 2) + ':' + numberToString(minutes, 2);
}

function numberToString(number, numCount) {
    --numCount;
    return number < 10 * numCount ? '0' + number : number;
}

function declineWord(number, decls) {
    var cases = [2, 0, 1, 1, 1, 2];
    return decls[ (number % 100 > 4 && number % 100 < 20) ?
        2 : cases[ (number % 10 < 5) ? number % 10 : 5] ];
}

function getSeconds(date) {
    var time = date.match(hourRegex);
    var data = {
        day: date.split(' ')[0],
        hour: parseInt(time[0].split(':')[0]),
        minutes: parseInt(time[0].split(':')[1])
    };
    var daysPassed = data.day === 'ПН' ? 0 : data.day === 'ВТ' ? 1 : 2;
    return daysPassed * daySeconds + data.hour * hourSeconds + data.minutes * 60;
}
