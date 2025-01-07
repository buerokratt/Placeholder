import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useIdleTimer } from 'react-idle-timer';
import { MdOutlineExpandMore } from 'react-icons/md';

import {
  Track,
  Button,
  Icon,
  Drawer,
  Section,
  SwitchBox,
  Switch,
  Dialog,
} from 'components';
import useStore from 'store';
import { ReactComponent as BykLogo } from 'assets/logo.svg';
import { UserProfileSettings } from 'types/userProfileSettings';
import { Chat as ChatType } from 'types/chat';
import { useToast } from 'hooks/useToast';
import { USER_IDLE_STATUS_TIMEOUT } from 'constants/config';
import { apiDev } from 'services/api';
import { interval } from 'rxjs';
import { AUTHORITY } from 'types/authorities';
import { useCookies } from 'react-cookie';
import { useDing } from 'hooks/useAudio';
import './Header.scss';
import { CustomerSupportActivityDTO } from 'types/customerSupportActivity';

type CustomerSupportActivity = {
  idCode: string;
  active: true;
  status: string;
};

const statusColors: Record<string, string> = {
  idle: '#FFB511',
  online: '#308653',
  offline: '#D73E3E',
};

const Header: FC = () => {
  const { t } = useTranslation();
  const userInfo = useStore((state) => state.userInfo);
  const toast = useToast();
  let secondsUntilStatusPopup = 300;
  const [statusPopupTimerHasStarted, setStatusPopupTimerHasStarted] =
    useState(false);
  const [showStatusConfirmationModal, setShowStatusConfirmationModal] =
    useState(false);

  const queryClient = useQueryClient();
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [csaStatus, setCsaStatus] = useState<'idle' | 'offline' | 'online'>(
    'online'
  );
  const [ding] = useDing();
  const chatCsaActive = useStore((state) => state.chatCsaActive);
  const [userProfileSettings, setUserProfileSettings] =
    useState<UserProfileSettings>({
      userId: 1,
      forwardedChatPopupNotifications: true,
      forwardedChatSoundNotifications: true,
      forwardedChatEmailNotifications: false,
      newChatPopupNotifications: false,
      newChatSoundNotifications: true,
      newChatEmailNotifications: false,
      useAutocorrect: true,
    });
  const customJwtCookieKey = 'customJwtCookie';

  useEffect(() => {
    const interval = setInterval(() => {
      const expirationTimeStamp = localStorage.getItem('exp');
      if (
        expirationTimeStamp !== 'null' &&
        expirationTimeStamp !== null &&
        expirationTimeStamp !== undefined
      ) {
        const expirationDate = new Date(parseInt(expirationTimeStamp) ?? '');
        const currentDate = new Date(Date.now());
        if (expirationDate < currentDate) {
          localStorage.removeItem('exp');
          window.location.href =
            import.meta.env.REACT_APP_CUSTOMER_SERVICE_LOGIN;
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [userInfo]);

  useEffect(() => {
    getMessages();
  }, [userInfo?.idCode]);

  const getMessages = async () => {
    const { data: res } = await apiDev.get('accounts/settings');

    if (res.response && res.response != 'error: not found')
      setUserProfileSettings(res.response[0]);
  };
  const { data: customerSupportActivity } = useQuery<CustomerSupportActivity>({
    queryKey: ['accounts/customer-support-activity', 'prod'],
    onSuccess(res: any) {
      const activity = res.data.get_customer_support_activity[0];
      setCsaStatus(activity.status);
      useStore.getState().setChatCsaActive(activity.active === 'true');
    },
  });

  useQuery<ChatType[]>({
    queryKey: ['agents/chats/active', 'prod'],
    onSuccess(res: any) {
      useStore.getState().setActiveChats(res.data.get_all_active_chats);
    },
  });

  const [_, setCookie] = useCookies([customJwtCookieKey]);
  const unansweredChatsLength = useStore((state) =>
    state.unansweredChatsLength()
  );
  const forwardedChatsLength = useStore((state) =>
    state.forwordedChatsLength()
  );

  const handleNewMessage = () => {
    if (unansweredChatsLength <= 0) {
      return;
    }

    if (userProfileSettings.newChatSoundNotifications) {
      ding?.play();
    }
    if (userProfileSettings.newChatEmailNotifications) {
      // To be done: send email notification
    }
    if (userProfileSettings.newChatPopupNotifications) {
      toast.open({
        type: 'info',
        title: t('global.notification'),
        message: t('settings.users.newUnansweredChat'),
      });
    }
  };

  useEffect(() => {
    handleNewMessage();

    const subscription = interval(2 * 60 * 1000).subscribe(() =>
      handleNewMessage()
    );
    return () => {
      subscription?.unsubscribe();
    };
  }, [unansweredChatsLength, userProfileSettings]);

  const handleForwordMessage = () => {
    if (forwardedChatsLength <= 0) {
      return;
    }

    if (userProfileSettings.forwardedChatSoundNotifications) {
      ding?.play();
    }
    if (userProfileSettings.forwardedChatEmailNotifications) {
      // To be done: send email notification
    }
    if (userProfileSettings.forwardedChatPopupNotifications) {
      toast.open({
        type: 'info',
        title: t('global.notification'),
        message: t('settings.users.newForwardedChat'),
      });
    }
  };

  useEffect(() => {
    handleForwordMessage();

    const subscription = interval(2 * 60 * 1000).subscribe(
      () => handleForwordMessage
    );
    return () => {
      subscription?.unsubscribe();
    };
  }, [forwardedChatsLength, userProfileSettings]);

  const userProfileSettingsMutation = useMutation({
    mutationFn: async (data: UserProfileSettings) => {
      await apiDev.post('accounts/settings', {
        forwardedChatPopupNotifications: data.forwardedChatPopupNotifications,
        forwardedChatSoundNotifications: data.forwardedChatSoundNotifications,
        forwardedChatEmailNotifications: data.newChatEmailNotifications,
        newChatPopupNotifications: data.newChatPopupNotifications,
        newChatSoundNotifications: data.newChatSoundNotifications,
        newChatEmailNotifications: data.newChatEmailNotifications,
        useAutocorrect: data.useAutocorrect,
      });
      setUserProfileSettings(data);
    },
    onError: async (error: AxiosError) => {
      await queryClient.invalidateQueries(['accounts/settings']);
      toast.open({
        type: 'error',
        title: t('global.notificationError'),
        message: error.message,
      });
    },
  });

  const unClaimAllAssignedChats = useMutation({
    mutationFn: async () => {
      await apiDev.post('chats/assigned/unclaim');
    },
  });

  const customerSupportActivityMutation = useMutation({
    mutationFn: (data: CustomerSupportActivityDTO) =>
      apiDev.post('accounts/customer-support-activity', {
        customerSupportActive: data.customerSupportActive,
        customerSupportStatus: data.customerSupportStatus,
      }),
    onSuccess: () => {
      if (csaStatus === 'online') extendUserSessionMutation.mutate();
    },
    onError: async (error: AxiosError) => {
      await queryClient.invalidateQueries([
        'accounts/customer-support-activity',
        'prod',
      ]);
      toast.open({
        type: 'error',
        title: t('global.notificationError'),
        message: error.message,
      });
    },
  });

  const setNewCookie = (cookieValue: string) => {
    const cookieOptions = { path: '/' };
    setCookie(customJwtCookieKey, cookieValue, cookieOptions);
  };

  const extendUserSessionMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { data },
      } = await apiDev.post('extend', {});
      if (data.custom_jwt_extend === null) return;
      setNewCookie(data.custom_jwt_extend);
    },
    onError: (error: AxiosError) => {},
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiDev.get('accounts/logout'),
    onSuccess(_: any) {
      window.location.href = import.meta.env.REACT_APP_CUSTOMER_SERVICE_LOGIN;
    },
    onError: async (error: AxiosError) => {
      toast.open({
        type: 'error',
        title: t('global.notificationError'),
        message: error.message,
      });
    },
  });

  const onIdle = () => {
    if (!customerSupportActivity) return;
    if (csaStatus === 'offline') return;

    setCsaStatus('idle');
    customerSupportActivityMutation.mutate({
      customerSupportActive: chatCsaActive,
      customerSupportId: customerSupportActivity.idCode,
      customerSupportStatus: 'idle',
    });
  };

  const onActive = () => {
    if (!customerSupportActivity) return;
    if (csaStatus === 'offline') {
      setShowStatusConfirmationModal((value) => !value);
      return;
    }

    setCsaStatus('online');
    customerSupportActivityMutation.mutate({
      customerSupportActive: chatCsaActive,
      customerSupportId: customerSupportActivity.idCode,
      customerSupportStatus: 'online',
    });
  };

  useIdleTimer({
    onIdle,
    onActive,
    timeout: USER_IDLE_STATUS_TIMEOUT,
    throttle: 500,
  });

  const handleUserProfileSettingsChange = (key: string, checked: boolean) => {
    if (!userProfileSettings) return;
    const newSettings = {
      ...userProfileSettings,
      [key]: checked,
    };
    userProfileSettingsMutation.mutate(newSettings);
  };

  const handleCsaStatusChange = (checked: boolean) => {
    if (checked === false) unClaimAllAssignedChats.mutate();

    useStore.getState().setChatCsaActive(checked);
    setCsaStatus(checked === true ? 'online' : 'offline');
    customerSupportActivityMutation.mutate({
      customerSupportActive: checked,
      customerSupportStatus: checked === true ? 'online' : 'offline',
      customerSupportId: '',
    });

    if (!checked) showStatusChangePopup();
  };

  const showStatusChangePopup = () => {
    if (statusPopupTimerHasStarted) return;

    setStatusPopupTimerHasStarted((value) => !value);
    const timer = setInterval(() => {
      let time = secondsUntilStatusPopup;
      while (time > 0) {
        time -= 1;
      }
      clearInterval(timer);
      setShowStatusConfirmationModal((value) => !value);
      setStatusPopupTimerHasStarted((value) => !value);
    }, 1000);
  };

  return (
    <>
      <header className="header">
        <Track justify="between">
          <BykLogo height={50} />
          {userInfo && (
            <Track gap={32}>
              <Track gap={16}>
                <p
                  style={{
                    color: '#5D6071',
                    fontSize: 14,
                    textTransform: 'lowercase',
                  }}
                >
                  <strong>{unansweredChatsLength}</strong>{' '}
                  {t('chat.unanswered')} <strong>{forwardedChatsLength}</strong>{' '}
                  {t('chat.forwarded')}
                </p>
                <Switch
                  onCheckedChange={handleCsaStatusChange}
                  checked={chatCsaActive}
                  label={t('global.csaStatus')}
                  hideLabel
                  name="csaStatus"
                  onColor="#308653"
                  onLabel={t('global.present') ?? ''}
                  offLabel={t('global.away') ?? ''}
                />
              </Track>
              <span
                style={{
                  display: 'block',
                  width: 2,
                  height: 30,
                  backgroundColor: '#DBDFE2',
                }}
              ></span>
              <Button
                appearance="text"
                onClick={() => setUserDrawerOpen(!userDrawerOpen)}
              >
                <span
                  style={{
                    display: 'block',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: statusColors[csaStatus],
                    marginRight: 8,
                  }}
                ></span>
                {userInfo.displayName}
                <Icon icon={<MdOutlineExpandMore />} />
              </Button>
              <Button
                appearance="text"
                style={{ textDecoration: 'underline' }}
                onClick={() => {
                  customerSupportActivityMutation.mutate({
                    customerSupportActive: false,
                    customerSupportStatus: 'offline',
                    customerSupportId: userInfo.idCode,
                  });
                  localStorage.removeItem('exp');
                  logoutMutation.mutate();
                }}
              >
                {t('global.logout')}
              </Button>
            </Track>
          )}
        </Track>
      </header>

      {showStatusConfirmationModal && (
        <Dialog
          onClose={() => setShowStatusConfirmationModal((value) => !value)}
          footer={
            <>
              <Button
                appearance="secondary"
                onClick={() =>
                  setShowStatusConfirmationModal((value) => !value)
                }
              >
                {t('global.cancel')}
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  handleCsaStatusChange(true);
                  setShowStatusConfirmationModal((value) => !value);
                }}
              >
                {t('global.yes')}
              </Button>
            </>
          }
        >
          <div className="dialog__body">
            <h1
              style={{ fontSize: '24px', fontWeight: '400', color: '#09090B' }}
            >
              {t('global.statusChangeQuestion')}
            </h1>
          </div>
        </Dialog>
      )}

      {userInfo && userProfileSettings && userDrawerOpen && (
        <Drawer
          title={userInfo.displayName}
          onClose={() => setUserDrawerOpen(false)}
          style={{ width: 400 }}
        >
          <Section>
            <Track gap={8} direction="vertical" align="left">
              {[
                {
                  label: t('settings.users.displayName'),
                  value: userInfo.displayName,
                },
                {
                  label: t('settings.users.userRoles'),
                  value: userInfo.authorities
                    .map((r) => t(`roles.${r}`))
                    .join(', '),
                },
                {
                  label: t('settings.users.userTitle'),
                  value: userInfo.csaTitle?.replaceAll(' ', '\xa0'),
                },
                { label: t('settings.users.email'), value: userInfo.csaEmail },
              ].map((meta, index) => (
                <Track key={`${meta.label}-${index}`} gap={24} align="left">
                  <p style={{ flex: '0 0 120px' }}>{meta.label}:</p>
                  <p>{meta.value}</p>
                </Track>
              ))}
            </Track>
          </Section>
          {[
            AUTHORITY.ADMINISTRATOR,
            AUTHORITY.CUSTOMER_SUPPORT_AGENT,
            AUTHORITY.SERVICE_MANAGER,
          ].some((auth) => userInfo.authorities.includes(auth)) && (
            <>
              <Section>
                <Track gap={8} direction="vertical" align="left">
                  <p className="h6">{t('settings.users.autoCorrector')}</p>
                  <SwitchBox
                    name="useAutocorrect"
                    label={t('settings.users.useAutocorrect')}
                    checked={userProfileSettings.useAutocorrect}
                    onCheckedChange={(checked) =>
                      handleUserProfileSettingsChange('useAutocorrect', checked)
                    }
                  />
                </Track>
              </Section>
              <Section>
                <Track gap={8} direction="vertical" align="left">
                  <p className="h6">{t('settings.users.emailNotifications')}</p>
                  <SwitchBox
                    name="forwardedChatEmailNotifications"
                    label={t('settings.users.newForwardedChat')}
                    checked={
                      userProfileSettings.forwardedChatEmailNotifications
                    }
                    onCheckedChange={(checked) =>
                      handleUserProfileSettingsChange(
                        'forwardedChatEmailNotifications',
                        checked
                      )
                    }
                  />
                  <SwitchBox
                    name="newChatEmailNotifications"
                    label={t('settings.users.newUnansweredChat')}
                    checked={userProfileSettings.newChatEmailNotifications}
                    onCheckedChange={(checked) =>
                      handleUserProfileSettingsChange(
                        'newChatEmailNotifications',
                        checked
                      )
                    }
                  />
                </Track>
              </Section>
              <Section>
                <Track gap={8} direction="vertical" align="left">
                  <p className="h6">{t('settings.users.soundNotifications')}</p>
                  <SwitchBox
                    name="forwardedChatSoundNotifications"
                    label={t('settings.users.newForwardedChat')}
                    checked={
                      userProfileSettings.forwardedChatSoundNotifications
                    }
                    onCheckedChange={(checked) =>
                      handleUserProfileSettingsChange(
                        'forwardedChatSoundNotifications',
                        checked
                      )
                    }
                  />
                  <SwitchBox
                    name="newChatSoundNotifications"
                    label={t('settings.users.newUnansweredChat')}
                    checked={userProfileSettings.newChatSoundNotifications}
                    onCheckedChange={(checked) =>
                      handleUserProfileSettingsChange(
                        'newChatSoundNotifications',
                        checked
                      )
                    }
                  />
                </Track>
              </Section>
              <Section>
                <Track gap={8} direction="vertical" align="left">
                  <p className="h6">{t('settings.users.popupNotifications')}</p>
                  <SwitchBox
                    name="forwardedChatPopupNotifications"
                    label={t('settings.users.newForwardedChat')}
                    checked={
                      userProfileSettings.forwardedChatPopupNotifications
                    }
                    onCheckedChange={(checked) =>
                      handleUserProfileSettingsChange(
                        'forwardedChatPopupNotifications',
                        checked
                      )
                    }
                  />
                  <SwitchBox
                    name="newChatPopupNotifications"
                    label={t('settings.users.newUnansweredChat')}
                    checked={userProfileSettings.newChatPopupNotifications}
                    onCheckedChange={(checked) =>
                      handleUserProfileSettingsChange(
                        'newChatPopupNotifications',
                        checked
                      )
                    }
                  />
                </Track>
              </Section>
            </>
          )}
        </Drawer>
      )}
    </>
  );
};

export default Header;
