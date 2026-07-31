module.exports.home = (req, res) => {
  res.render('index', { error: req.query.error });
};
