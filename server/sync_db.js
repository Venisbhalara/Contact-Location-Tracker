/**
 * sync_db.js
 * 
 * INTELLIGENT DATABASE SYNCHRONIZER
 * This script automatically inspects all Sequelize models and adds any missing 
 * columns to the database tables. No more manual column lists!
 */
require("dotenv").config();
const sequelize = require("./config/db");
const models = require("./models/index");

async function sync() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected.");

    const queryInterface = sequelize.getQueryInterface();

    // Iterate through all registered models
    for (const modelName of Object.keys(models)) {
      const model = models[modelName];
      if (!model.getAttributes) continue;

      const tableName = model.getTableName();
      console.log(`\n🔍 Inspecting table: ${tableName} (Model: ${modelName})`);

      // 1. Ensure table exists
      await model.sync();

      // 2. Get existing columns in the DB
      const tableInfo = await queryInterface.describeTable(tableName);
      const existingCols = Object.keys(tableInfo).map(c => c.toLowerCase());

      // 3. Check each attribute defined in the model
      const attributes = model.getAttributes();
      for (const [attrName, attrDetails] of Object.entries(attributes)) {
        // Use the explicit 'field' name if provided, otherwise the attribute name
        const columnName = attrDetails.field || attrName;
        
        if (existingCols.includes(columnName.toLowerCase())) {
          // console.log(`  ⏭️  '${columnName}' exists.`);
          continue;
        }

        try {
          console.log(`  🔨 Adding column: ${columnName} to ${tableName}...`);
          
          // Use QueryInterface to add the column with correct type and options
          await queryInterface.addColumn(tableName, columnName, attrDetails);
          
          console.log(`  ✅ Successfully added '${columnName}'.`);

          // If it has a default value that isn't NULL, initialize existing rows
          if (attrDetails.defaultValue !== undefined && attrDetails.defaultValue !== null) {
            let defVal = attrDetails.defaultValue;
            // Handle string vs number vs boolean for the SQL update
            let sqlVal = defVal;
            if (typeof defVal === 'string') sqlVal = `'${defVal}'`;
            if (typeof defVal === 'boolean') sqlVal = defVal ? 1 : 0;
            
            if (typeof sqlVal !== 'object') { // Skip complex JSON defaults for now
              console.log(`  🪄  Initializing existing rows for '${columnName}' with ${sqlVal}...`);
              await sequelize.query(`UPDATE ${tableName} SET \`${columnName}\` = ${sqlVal} WHERE \`${columnName}\` IS NULL`);
            }
          }
        } catch (colErr) {
          console.error(`  ❌ Failed to add '${columnName}':`, colErr.message);
        }
      }
    }

    console.log("\n✨ Intelligent Database synchronization complete!");
    process.exit(0);
  } catch (err) {
    console.error("\n💥 FATAL ERROR during sync:", err.message);
    process.exit(1);
  }
}

sync();
