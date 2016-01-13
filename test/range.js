module.exports = function range(start, count) {
    var end = start + count
        , all = [];
    for (var i = start; i < end; i += 1) {
        all.push(i)
    }
    return all
};
