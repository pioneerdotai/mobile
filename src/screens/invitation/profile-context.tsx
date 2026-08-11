import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

type InvitationProfileContextValue = {
    nickname: string;
    nicknameError: string | null;
    setNickname: (value: string) => void;
    setNicknameError: (value: string | null) => void;
};

const InvitationProfileContext = createContext<InvitationProfileContextValue | null>(null);

const InvitationProfileProvider = ({
    children,
    initialNickname = '',
}: {
    children: ReactNode;
    initialNickname?: string;
}) => {
    const [nickname, setNickname] = useState(initialNickname);
    const [nicknameError, setNicknameError] = useState<string | null>(null);
    const value = useMemo(
        () => ({ nickname, nicknameError, setNickname, setNicknameError }),
        [nickname, nicknameError],
    );

    return (
        <InvitationProfileContext.Provider value={value}>
            {children}
        </InvitationProfileContext.Provider>
    );
};

const useInvitationProfile = (): InvitationProfileContextValue => {
    const value = useContext(InvitationProfileContext);
    if (!value) {
        throw new Error('useInvitationProfile must be used inside InvitationProfileProvider');
    }
    return value;
};

export { InvitationProfileProvider, useInvitationProfile };
