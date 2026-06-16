module.exports = {
    dependency: {
        platforms: {
            ios: {},
            android: {
                packageImportPath:
                    'import com.margelo.nitro.pioneer.client.PioneerClientNitroPackage;',
                packageInstance: 'new PioneerClientNitroPackage()',
            },
        },
    },
};
