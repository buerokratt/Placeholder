import { FC, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createColumnHelper, PaginationState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { AxiosError } from 'axios';
import { MdMailOutline, MdOutlineRemoveRedEye } from 'react-icons/md';

import {
  Button,
  Card,
  DataTable,
  Dialog,
  Drawer,
  FormInput,
  FormMultiselect,
  HistoricalChat,
  Icon,
  Tooltip,
  Track,
} from 'components';
import { CHAT_EVENTS, CHAT_STATUS, Chat as ChatType } from 'types/chat';
import { Message } from 'types/message';
import { useToast } from 'hooks/useToast';
import api from 'services/api';
import apiDev from 'services/api-dev';
import useUserInfoStore from '../../../store/store';

const ChatHistory: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { userInfo } = useUserInfoStore();
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [sendToEmailModal, setSendToEmailModal] = useState<ChatType | null>(null);
  const [statusChangeModal, setStatusChangeModal] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [endedChatsList, setEndedChatsList] = useState<ChatType[]>([]);
  const [filteredEndedChatsList, setFilteredEndedChatsList] = useState<ChatType[]>([]);
  const [chatMessagesList, setchatMessagesList] = useState<Message[]>([]);

  const { data: endedChats } = useQuery<ChatType[]>({
    queryKey: ['cs-get-all-ended-chats', 'prod'],
    onSuccess(res: any) {
      setEndedChatsList(res.data.cs_get_all_ended_chats ?? []);
      setFilteredEndedChatsList(res.data.cs_get_all_ended_chats ?? [])
    },
  });
  const { data: chatMessages } = useQuery<Message[]>({
    queryKey: ['cs-get-messages-by-chat-id', selectedChat?.id, 'prod'],
    enabled: !!selectedChat,
    onSuccess(res: any) {
      setchatMessagesList(res.data.cs_get_messages_by_chat_id);

    },
  });

  const visibleColumnOptions = useMemo(() => [
    { label: t('chat.history.startTime'), value: 'created' },
    { label: t('chat.history.endTime'), value: 'ended' },
    { label: t('chat.history.csaName'), value: 'customerSupportDisplayName' },
    { label: t('global.name'), value: '' },
    { label: t('chat.history.contact'), value: 'contactsMessage' },
    { label: t('chat.history.comment'), value: 'comment' },
    { label: t('chat.history.label'), value: 'labels' },
    // { label: t('chat.history.nps'), value: 'nps' },
    { label: t('global.status'), value: 'status' },
    { label: 'ID', value: 'id' },
  ], [t]);

  const sendToEmailMutation = useMutation({
    mutationFn: (data: ChatType) => api.post('cs-send-chat-to-email', data),
    onSuccess: () => {
      toast.open({
        type: 'success',
        title: t('global.notification'),
        message: 'Message sent to user email',
      });
    },
    onError: (error: AxiosError) => {
      toast.open({
        type: 'error',
        title: t('global.notificationError'),
        message: error.message,
      });
    },
    onSettled: () => setSendToEmailModal(null),
  });

  const searchChatsMutation = useMutation({
    mutationFn: (searchKey: string) => apiDev.post('cs-get-chat-ids-matching-message-search', {
      'searchKey': searchKey
    }),
    onSuccess: (res) => {
      const responseList = (res.data.data.get_chat_ids_matching_message_search ?? []).map((item: any) => item.chatId);
      const filteredChats = endedChatsList.filter(item => responseList.includes(item.id));
      setFilteredEndedChatsList(filteredChats);
    }
  });

  const chatStatusChangeMutation = useMutation({
    mutationFn: async (data: { chatId: string | number, event: string }) => {
      const changeableTo = [
        CHAT_EVENTS.CLIENT_LEFT_WITH_ACCEPTED.toUpperCase(),
        CHAT_EVENTS.CLIENT_LEFT_WITH_NO_RESOLUTION.toUpperCase(),
      ];
      const isChangeable = changeableTo.includes(data.event);

      if (selectedChat?.lastMessageEvent === data.event.toLowerCase()) return;
      if (selectedChat?.lastMessageEvent !== CHAT_EVENTS.CLIENT_LEFT_FOR_UNKNOWN_REASONS) return;
      if (!isChangeable) return;

      await apiDev.post('cs-end-chat', {
        chatId: selectedChat!.id,
        event: data.event.toUpperCase(),
        authorTimestamp: new Date().toISOString(),
        authorFirstName: userInfo!.firstName,
        authorId: userInfo!.idCode,
        authorRole: userInfo!.authorities
      });
    },
    onSuccess: () => {
      toast.open({
        type: 'success',
        title: t('global.notification'),
        message: 'Chat status changed',
      });
      setStatusChangeModal(null);
    },
    onError: (error: AxiosError) => {
      toast.open({
        type: 'error',
        title: t('global.notificationError'),
        message: error.message,
      });
    },
    onSettled: () => setStatusChangeModal(null),
  });

  const chatCommentChangeMutation = useMutation({
    mutationFn: (data: { chatId: string | number, comment: string }) => api.post('cs-comment-history', data),
    onSuccess: () => {
      toast.open({
        type: 'success',
        title: t('global.notification'),
        message: 'Chat comment changed',
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

  const columnHelper = createColumnHelper<ChatType>();

  const endedChatsColumns = useMemo(() => [
    columnHelper.accessor('created', {
      header: t('chat.history.startTime') || '',
      cell: (props) => format(new Date(props.getValue()), 'd. MMM yyyy HH:ii:ss'),
    }),
    columnHelper.accessor('ended', {
      header: t('chat.history.endTime') || '',
      cell: (props) => format(new Date(props.getValue()), 'd. MMM yyyy HH:ii:ss'),
    }),
    columnHelper.accessor('customerSupportDisplayName', {
      header: t('chat.history.csaName') || '',
    }),
    columnHelper.accessor((row) => `${row.endUserFirstName} ${row.endUserLastName}`, {
      header: t('global.name') || '',
    }),
    columnHelper.accessor('endUserId', {
      header: t('global.idCode') || '',
    }),
    columnHelper.accessor('contactsMessage', {
      header: t('chat.history.contact') || '',
      cell: (props) => props.getValue()
        ? t('global.yes')
        : t('global.no'),
    }),
    columnHelper.accessor('comment', {
      header: t('chat.history.comment') || '',
      cell: (props) => (
        <Tooltip content={props.getValue()}>
          <span>{props.getValue() === undefined ? '' : props.getValue()?.slice(0, 30) + '...'}</span>
        </Tooltip>
      ),
    }),
    columnHelper.accessor('labels', {
      header: t('chat.history.label') || '',
      cell: (props) => <span></span>,
    }),
    // columnHelper.accessor('nps', {
    //   header: 'NPS',
    // }),
    columnHelper.accessor('status', {
      header: t('global.status') || '',
      cell: (props) => props.getValue() === CHAT_STATUS.ENDED ? t('chat.status.ended') : '',
    }),
    columnHelper.accessor('id', {
      header: 'ID',
    }),
    columnHelper.display({
      id: 'detail',
      cell: (props) => (
        <Button appearance='text' onClick={() => setSelectedChat(props.row.original)}>
          <Icon icon={<MdOutlineRemoveRedEye color={'rgba(0,0,0,0.54)'} />} />
          {t('global.view')}
        </Button>
      ),
      meta: {
        size: '1%',
      },
    }),
    columnHelper.display({
      id: 'forward',
      cell: (props) => (
        <Button appearance='text' onClick={() => setSendToEmailModal(props.row.original)}>
          <Icon icon={<MdMailOutline color={'rgba(0,0,0,0.54)'} />} />
          {t('chat.active.sendToEmail')}
        </Button>
      ),
      meta: {
        size: '1%',
      },
    }),
  ], []);

  const handleChatStatusChange = (event: string) => {
    if (!selectedChat) return;
    chatStatusChangeMutation.mutate({ chatId: selectedChat.id, event: event.toUpperCase() });
  };

  const handleCommentChange = (comment: string) => {
    if (!selectedChat) return;
    chatCommentChangeMutation.mutate({ chatId: selectedChat.id, comment });
  };

  if (!filteredEndedChatsList) return <>Loading...</>;

  return (
    <>
      <h1>{t('chat.history.title')}</h1>

      <Card>
        <Track gap={16}>
          <FormInput
            label={t('chat.history.searchChats')}
            hideLabel
            name='searchChats'
            placeholder={t('chat.history.searchChats') + '...'}
            onChange={(e) => e.target.value.length === 0 ? setFilteredEndedChatsList(endedChatsList) : searchChatsMutation.mutate(e.target.value)}
          />
          <FormMultiselect
            name='visibleColumns'
            label={t('')}
            options={visibleColumnOptions}
          />
        </Track>
      </Card>

      <Card>
        <DataTable
          data={filteredEndedChatsList}
          sortable
          columns={endedChatsColumns}
          pagination={pagination}
          setPagination={setPagination}
        />
      </Card>

      {selectedChat && chatMessagesList && (
        <Drawer
          title={selectedChat.endUserFirstName !== '' && selectedChat.endUserLastName !== ''
            ? `${selectedChat.endUserFirstName} ${selectedChat.endUserLastName}`
            : t('global.anonymous')}
          onClose={() => setSelectedChat(null)}
        >
          <HistoricalChat
            chat={selectedChat}
            onChatStatusChange={setStatusChangeModal}
            onCommentChange={handleCommentChange}
          />
        </Drawer>
      )}

      {sendToEmailModal !== null && (
        <Dialog
          title={t('chat.active.sendToEmail')}
          onClose={() => setSendToEmailModal(null)}
          footer={
            <>
              <Button appearance='secondary' onClick={() => setSendToEmailModal(null)}>{t('global.no')}</Button>
              <Button
                appearance='error'
                onClick={() => sendToEmailMutation.mutate(sendToEmailModal)}
              >
                {t('global.yes')}
              </Button>
            </>
          }
        >
          <p>{t('global.removeValidation')}</p>
        </Dialog>
      )}

      {statusChangeModal && (
        <Dialog
          title={t('chat.changeStatus')}
          onClose={() => setSendToEmailModal(null)}
          footer={
            <>
              <Button appearance='secondary' onClick={() => setStatusChangeModal(null)}>{t('global.cancel')}</Button>
              <Button
                appearance='error'
                onClick={() => handleChatStatusChange(statusChangeModal)}
              >
                {t('global.yes')}
              </Button>
            </>
          }
        >
          <p>{t('global.removeValidation')}</p>
        </Dialog>
      )}
    </>
  );
};

export default ChatHistory;
