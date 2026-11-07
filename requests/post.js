module.exports = async function postMethod(requestProps) {
  requestProps.res.writeHead(204);
  requestProps.res.end();
};
