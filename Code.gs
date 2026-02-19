function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();
  // Remove headers if you have them, or just treat all as data
  // Simple approach: Column A=Name, B=IsPizza, C=IsHome, D=IsLake, E=ID
  const meals = [];
  if (data.length > 0) {
     for (let i = 0; i < data.length; i++) {
       const row = data[i];
       if(row[0] === "Name") continue; // skip header
       meals.push({
         name: row[0],
         isPizza: row[1] === true,
         isHome: row[2] === true,
         isLake: row[3] === true,
         id: row[4] || Utilities.getUuid()
       });
     }
  }
  return ContentService.createTextOutput(JSON.stringify(meals))
    .setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const json = e.postData.contents;
  const meals = JSON.parse(json);

  sheet.clear();
  sheet.appendRow(["Name", "IsPizza", "IsHome", "IsLake", "ID"]); // Header

  const rows = meals.map(m => [m.name, m.isPizza, m.isHome, m.isLake, m.id]);
  if(rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }

  return ContentService.createTextOutput("Success");
}