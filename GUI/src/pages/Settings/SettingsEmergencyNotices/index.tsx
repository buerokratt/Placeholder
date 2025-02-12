import { FC, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Card,
  FormDatepicker,
  FormTextarea,
  Switch,
  Track,
} from 'components';
import { EMERGENCY_NOTICE_LENGTH } from 'constants/config';
import {
  EmergencyNotice,
  EmergencyNoticeResponse,
} from 'types/emergencyNotice';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'hooks/useToast';
import { apiDev } from 'services/api';
import { format, parse } from 'date-fns';
import withAuthorization from 'hoc/with-authorization';
import { ROLES } from 'utils/constants';

const SettingsEmergencyNotices: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { register, control, handleSubmit, reset, setValue } = useForm<EmergencyNotice>();
  const [isEmergencyNoticeVisible, setIsEmergencyNoticeVisible] =
    useState(false);
  const [emergencyNoticeText, setEmergencyNoticeText] = useState('');
  const { data: emergencyNotice } = useQuery<EmergencyNoticeResponse>({
    queryKey: ['configs/emergency-notice', 'prod'],
    onSuccess: (data: EmergencyNoticeResponse) => {
      const {
        isEmergencyNoticeVisible,
        emergencyNoticeStartISO,
        emergencyNoticeEndISO,
        emergencyNoticeText,
      } = data.response;

      if (Object.keys(control._formValues).length > 0) return;

      const isEmergencyNoticeVisibleBoolean =
        isEmergencyNoticeVisible === 'true';
      setIsEmergencyNoticeVisible(isEmergencyNoticeVisibleBoolean);
      setEmergencyNoticeText(emergencyNoticeText ?? '');
      reset({
        emergencyNoticeStartISO: isEmergencyNoticeVisibleBoolean
          ? new Date(emergencyNoticeStartISO)
          : new Date(),
        emergencyNoticeEndISO: new Date(emergencyNoticeEndISO ?? '0'),
        emergencyNoticeText,
        isEmergencyNoticeVisible,
      });
    },
  });

  const handleSwitchChange = (checked: boolean) => {
    const today = new Date();
    setValue('emergencyNoticeStartISO', today);
    setValue('emergencyNoticeEndISO', today);
    setIsEmergencyNoticeVisible(checked);
  };

  const emergencyNoticeMutation = useMutation({
    mutationFn: (data: EmergencyNotice) =>
      apiDev.post<EmergencyNotice>('configs/emergency-notice', data),
    onSuccess: () => {
      toast.open({
        type: 'success',
        title: t('global.notification'),
        message: t('settings.emergencyNotices.noticeChanged'),
      });
    },
    onError: (error: AxiosError) => {
      toast.open({
        type: 'error',
        title: t('global.notificationError'),
        message: error.message,
      });
    },
  });

  const handleFormSubmit = handleSubmit((data) => {
    const formatDate = (date: Date) => new Date(format(date, 'yyyy-MM-dd'));
    const startDate = formatDate(new Date(data.emergencyNoticeStartISO));
    const endDate = formatDate(new Date(data.emergencyNoticeEndISO));
    if (endDate < startDate) {
      toast.open({
        type: 'error',
        title: t('global.notificationError'),
        message: t('settings.emergencyNotices.endDateError'),
      });
      return;
    }
    emergencyNoticeMutation.mutate({
      ...data,
      isEmergencyNoticeVisible: isEmergencyNoticeVisible.toString(),
      emergencyNoticeText,
    });
  });

  if (!emergencyNotice || Object.keys(control._formValues).length === 0)
    return <>Loading...</>;

  return (
    <>
      <h1>{t('settings.emergencyNotices.title')}</h1>

      <Card
        footer={
          <Track justify="end">
            <Button onClick={handleFormSubmit}>{t('global.save')}</Button>
          </Track>
        }
      >
        <Track gap={16} direction="vertical" align="left">
          <Controller
            name="isEmergencyNoticeVisible"
            control={control}
            render={({ field }) => (
              <Switch
                checked={isEmergencyNoticeVisible}
                onCheckedChange={handleSwitchChange}
                label={t('settings.emergencyNotices.noticeActive')}
                {...field}
              />
            )}
          />
          <FormTextarea
            {...register('emergencyNoticeText')}
            label={t('settings.emergencyNotices.notice')}
            minRows={1}
            maxLength={EMERGENCY_NOTICE_LENGTH}
            defaultValue={emergencyNoticeText}
            showMaxLength
            onChange={(e) => setEmergencyNoticeText(e.target.value)}
          />
          <Track gap={8}>
            <p style={{ flex: '0 0 185px' }}>
              {t('settings.emergencyNotices.displayPeriod')}
            </p>
            <Track gap={16}>
              <Controller
                name="emergencyNoticeStartISO"
                control={control}
                render={({ field }) => (
                  <FormDatepicker
                    label={t('global.startDate')}
                    hideLabel
                    {...field}
                    value={parse(
                      format(field.value as Date, 'yyyy-MM-dd'),
                      'yyyy-MM-dd',
                      new Date()
                    )}
                  />
                )}
              />
              <span>{t('global.to').toLowerCase()}</span>
              <Controller
                name="emergencyNoticeEndISO"
                control={control}
                render={({ field }) => (
                  <FormDatepicker
                    label={t('global.endDate')}
                    hideLabel
                    {...field}
                    value={
                      parse(
                        format(field.value as Date, 'yyyy-MM-dd'),
                        'yyyy-MM-dd',
                        new Date()
                      ) ?? new Date('0')
                    }
                  />
                )}
              />
            </Track>
          </Track>
        </Track>
      </Card>
    </>
  );
};

export default withAuthorization(SettingsEmergencyNotices, [
  ROLES.ROLE_ADMINISTRATOR,
]);
