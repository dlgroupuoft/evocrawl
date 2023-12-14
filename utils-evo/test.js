const utils = require("./utils");
let log_req_name = "log_index.php?date=yesterday&module=API&format=json&method=MultiSites.getAllWithGroups&hideMetricsDoc=1&filter_sort_order=desc&filter_limit=50&filter_offset=0&showColumns=label%2Cnb_visits%2Cnb_pageviews%2Cvisits_evolution%2Cvisits_evolution_trend%2Cpageviews_evolution%2Cpageviews_evolution_trend%2Crevenue_evolution%2Crevenue_evolution_trend%2Cnb_actions%2Crevenue&filter_sort_column=nb_visits&segment=&idSite=1&period=day.json";
let responses = {};
utils.logObject(responses, log_req_name, "../data/");