'use strict';

var daySeconds = 60 * 60 * 24;
var hourSeconds = 60 * 60;
var hourRegex = /([0-9]{2}:[0-9]{2})/;

module.exports = function () {
    return {
        // Здесь как-то хранится дата ;)
        date: null,

        // А здесь часовой пояс
        timezone: null,

        // Выводит дату в переданном формате
        format: function (pattern) {
            var day = this.date.split(' ')[0];
            var time = this.date.match(hourRegex)[0];
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
            var diff = getSeconds(this.date) - getSeconds(moment.date);
            var daysCount = parseInt(diff / daySeconds);
            if (daysCount >= 1) {
                diff -= daysCount * daySeconds;
                verb = declineWord(daysCount, ['остался', 'осталось', 'осталось']) + ' ';
                days = daysCount + ' ';
                days += declineWord(daysCount, ['день', 'дня', 'дней']) + ' ';
            }
            var hoursCount = parseInt(diff / hourSeconds);
            if (hoursCount >= 1) {
                diff -= hoursCount * hourSeconds;
                hours = hoursCount + ' ';
                hours += declineWord(hoursCount, ['час', 'часа', 'часов']) + ' ';
            }
            var minutesCount = parseInt(diff / 60);
            if (minutesCount != 0) {
                minutes = minutesCount + ' ';
                minutes += declineWord(minutesCount, ['минута', 'минуты', 'минут']) + ' ';
            }
            return 'До ограбления ' + verbose + days + hours + minutes;
        }
    };
};

function getTime(time, timezone) {
    var hour = time.split(':')[0];
    var timezoneHours = hour - (-1) * timezone;
    return timezoneHours + ':' + time.split(':')[1];
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
