import { useUnistyles } from 'react-native-unistyles';

import { useScreen } from '@/hooks/use-screen';

const useThreadsFolderScreen = () => {
    const { options } = useScreen();
    const { theme } = useUnistyles();

    return {
        name: 'threads/[folderId]',
        options: {
            ...options,
            headerShown: true,
            headerTitle: () => null,
            headerTransparent: true,
            headerStyle: {
                ...options.headerStyle,
                backgroundColor: 'transparent',
            },
            cardStyle: {
                ...options.cardStyle,
                backgroundColor: theme.colors.background,
            },
            sceneStyle: {
                ...options.sceneStyle,
                backgroundColor: theme.colors.background,
            },
        },
    };
};

export { useThreadsFolderScreen };
