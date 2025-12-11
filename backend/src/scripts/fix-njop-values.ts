import { db } from '../store/database';

/**
 * Migration script to fix corrupted NJOP Land values
 */

async function fixNjopValues() {
    console.log('🔧 Starting NJOP migration...\n');

    try {
        await db.init();

        const allReports = await db.getReports();
        console.log(`📊 Total reports: ${allReports.length}\n`);

        // Print diagnostic info
        console.log('📋 Current NJOP values in all reports:\n');
        allReports.forEach((report, index) => {
            const { njopLandPerM2, njopLand, njopBuildingPerM2, njopBuilding, landArea } = report.valuationInput;
            console.log(`Report ${index + 1}: ${report.generalInfo.reportNumber || report.id}`);
            console.log(`  njopLandPerM2: ${njopLandPerM2 ?? 'undefined'}`);
            console.log(`  njopLand: ${njopLand ?? 'undefined'}`);
            console.log(`  landArea: ${landArea ?? 'undefined'}`);
            if (landArea && njopLand) {
                const calc = Math.round(njopLand / landArea);
                console.log(`  → Calculated PerM2: ${calc}`);
            }
            console.log(`  njopBuildingPerM2: ${njopBuildingPerM2 ?? 'undefined'}`);
            console.log(`  njopBuilding: ${njopBuilding ?? 'undefined'}\n`);
        });

        let fixedCount = 0;
        const reportIds: string[] = [];

        for (const report of allReports) {
            const { njopLandPerM2, njopLand, landArea } = report.valuationInput;

            // Check if this report needs fixing
            if (njopLandPerM2 && njopLandPerM2 < 10000 && njopLand && njopLand >= 10000 && landArea && landArea > 0) {
                console.log(`\n🔄 Fixing Report: ${report.generalInfo.reportNumber || report.id}`);
                console.log(`   Before: njopLandPerM2=${njopLandPerM2}, njopLand=${njopLand}`);

                // Swap: njopLand is the correct per-m2 value
                const correctedPerM2 = njopLand;
                const correctedTotal = Math.round(correctedPerM2 * landArea);

                console.log(`   After:  njopLandPerM2=${correctedPerM2}, njopLand=${correctedTotal}`);

                await db.updateReport(report.id, {
                    valuationInput: {
                        ...report.valuationInput,
                        njopLandPerM2: correctedPerM2,
                        njopLand: correctedTotal,
                    },
                });

                fixedCount++;
                reportIds.push(report.id);
            }
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   Fixed ${fixedCount} report(s)`);

        if (reportIds.length > 0) {
            console.log(`\n📝 Fixed report IDs:`);
            reportIds.forEach(id => console.log(`   - ${id}`));
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    fixNjopValues()
        .then(() => {
            console.log('\n🎉 All done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Error:', error);
            process.exit(1);
        });
}

export { fixNjopValues };
