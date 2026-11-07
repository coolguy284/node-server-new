module.exports = async function optionsMethod(requestProps) {
  requestProps.res.writeHead(204);
  requestProps.res.end();
};
