module.exports = async function headMethod(requestProps) {
  requestProps.res.writeHead(204);
  requestProps.res.end();
};
