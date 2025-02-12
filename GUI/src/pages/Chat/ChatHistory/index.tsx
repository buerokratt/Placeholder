import React, { FC } from 'react';
import withAuthorization from 'hoc/with-authorization';
import { useToast } from '../../../hooks/useToast';
import useStore from 'store';
import { ChatHistory } from '@buerokratt-ria/common-gui-components';
import { ROLES } from 'utils/constants';

const History: FC = () => {
  return (
    <ChatHistory
      toastContext={useToast()}
      user={useStore.getState().userInfo}
    />
  );
};

export default withAuthorization(History, [
  ROLES.ROLE_ADMINISTRATOR,
  ROLES.ROLE_CHATBOT_TRAINER,
  ROLES.ROLE_SERVICE_MANAGER,
]);
