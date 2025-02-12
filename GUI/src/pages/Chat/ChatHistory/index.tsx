import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import {
  ColumnPinningState,
  createColumnHelper,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { AxiosError } from 'axios';
import './History.scss';
import { MdOutlineRemoveRedEye } from 'react-icons/md';

import {
  Button,
  Card,
  DataTable,
  Dialog,
  Drawer,
  FormDatepicker,
  FormInput,
  FormMultiselect,
  HistoricalChat,
  Icon,
  Tooltip,
  Track,
} from 'components';

import { Chat as ChatType, CHAT_EVENTS, CHAT_STATUS } from 'types/chat';
import { useToast } from 'hooks/useToast';
import { apiDev } from 'services/api';
import useStore from 'store';
import { Controller, useForm } from 'react-hook-form';
import { useLocation, useSearchParams } from 'react-router-dom';
import { unifyDateFromat } from './unfiyDate';
import withAuthorization from 'hoc/with-authorization';
import { ROLES } from 'utils/constants';
import { et } from 'date-fns/locale';
import { useDebouncedCallback } from 'use-debounce';

const ChatHistory: FC = () => {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const userInfo = useStore((state) => state.userInfo);
  const routerLocation = useLocation();
  const params = new URLSearchParams(routerLocation.search);
  let passedChatId = new URLSearchParams(routerLocation.search).get('chat');
  const passedStartDate = params.get('start');
  const passedEndDate = params.get('end');
  const passedCustomerSupportIds = params.getAll('customerSupportIds');
  const [search, setSearch] = useState('');
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusChangeModal, setStatusChangeModal] = useState<string | null>(
    null
  );
  const [chatState, setChatState] = useState<string | null>(statusChangeModal);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: searchParams.get('page')
      ? parseInt(searchParams.get('page') as string) - 1
      : 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const columnPinning: ColumnPinningState = {
    left: [],
    right: ['detail'],
  };
  const [totalPages, setTotalPages] = useState<number>(1);
  const [endedChatsList, setEndedChatsList] = useState<ChatType[]>([]);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [filteredEndedChatsList, setFilteredEndedChatsList] = useState<
    ChatType[]
  >([]);

  const [messagesTrigger, setMessagesTrigger] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [customerSupportAgents, setCustomerSupportAgents] = useState<any[]>([]);
  const [counterKey, setCounterKey] = useState<number>(0);

  const { control, watch } = useForm<{
    startDate: Date | string;
    endDate: Date | string;
  }>({
    defaultValues: {
      startDate: passedStartDate
        ? unifyDateFromat(passedStartDate)
        : new Date(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate()
          ),
      endDate: passedEndDate
        ? unifyDateFromat(passedEndDate)
        : new Date(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate()
          ),
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const debouncedGetAllEnded = useDebouncedCallback((search) => {
    getAllEndedChats.mutate({
      startDate: format(new Date(startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(endDate), 'yyyy-MM-dd'),
      customerSupportIds: passedCustomerSupportIds,
      pagination,
      sorting,
      search,
    });
  }, 500);

  useEffect(() => {
    if (passedChatId != null) {
      getChatById.mutate();
      passedChatId = null;
    }
  }, [passedChatId]);

  const fetchData = async () => {
    setInitialLoad(false);
    try {
      const response = await apiDev.get('/accounts/get-page-preference', {
        params: {
          user_id: userInfo?.idCode,
          page_name: window.location.pathname,
        },
      });
      if (response.data.pageResults !== undefined) {
        const newSelectedColumns =
          response.data?.selectedColumns.length === 1 &&
          response.data?.selectedColumns[0] === ''
            ? []
            : response.data?.selectedColumns;
        setSelectedColumns(newSelectedColumns);
        const updatedPagination = updatePagePreference(
          response.data.pageResults ?? 10
        );
        setCounterKey(counterKey + 1);
        getAllEndedChats.mutate({
          startDate: format(new Date(startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(endDate), 'yyyy-MM-dd'),
          customerSupportIds: passedCustomerSupportIds,
          pagination: updatedPagination,
          sorting,
          search,
        });
      }
    } catch (err) {
      console.error('Failed to fetch data');
    }
  };

  const updatePagePreference = (pageResults: number): PaginationState => {
    const updatedPagination: PaginationState = {
      ...pagination,
      pageSize: pageResults,
    };
    setPagination(updatedPagination);
    return updatedPagination;
  };

  useEffect(() => {
    if (initialLoad) {
      fetchData();
    } else {
      getAllEndedChats.mutate({
        startDate: format(new Date(startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(endDate), 'yyyy-MM-dd'),
        customerSupportIds: passedCustomerSupportIds,
        pagination,
        sorting,
        search,
      });
    }
  }, [selectedColumns]);

  useEffect(() => {
    listCustomerSupportAgents.mutate();
  }, []);

  const updatePagePreferences = useMutation({
    mutationFn: (data: {
      page_results: number;
      selected_columns: string[];
    }) => {
      return apiDev.post('accounts/update-page-preference', {
        user_id: userInfo?.idCode,
        page_name: window.location.pathname,
        page_results: data.page_results,
        selected_columns: `{"${data.selected_columns.join('","')}"}`,
      });
    },
  });

  const getAllEndedChats = useMutation({
    mutationFn: (data: {
      startDate: string;
      endDate: string;
      customerSupportIds: string[];
      pagination: PaginationState;
      sorting: SortingState;
      search: string;
    }) => {
      let sortBy = 'created desc';
      if (sorting.length > 0) {
        const sortType = sorting[0].desc ? 'desc' : 'asc';
        sortBy = `${sorting[0].id} ${sortType}`;
      }

      console.log('data', data, data.pagination, data.pagination.pageSize);

      return apiDev.post('agents/chats/ended', {
        customerSupportIds: data.customerSupportIds,
        startDate: data.startDate,
        endDate: data.endDate,
        page: data.pagination.pageIndex + 1,
        page_size: data.pagination.pageSize,
        sorting: sortBy,
        search,
      });
    },
    onSuccess: (res: any) => {
      if (selectedChat)
        setSelectedChat({
          ...selectedChat,
          lastMessageEvent: res.data.response[0].lastMessageEvent,
          lastMessageTimestamp: res.data.response[0].lastMessageTimestamp,
          userDisplayName: res.data.response[0].userDisplayName,
        });
      filterChatsList(res.data.response ?? []);
      setTotalPages(res?.data?.response[0]?.totalPages ?? 1);
    },
  });

  const getChatById = useMutation({
    mutationFn: () =>
      apiDev.post('chats/get', {
        chatId: passedChatId,
      }),
    onSuccess: (res: any) => {
      setSelectedChat(res.data.response);
      setChatState(res.data.response);
    },
  });

  const listCustomerSupportAgents = useMutation({
    mutationFn: () =>
      apiDev.post('accounts/customer-support-agents', {
        page: 0,
        page_size: 99999,
        sorting: 'name asc',
        show_active_only: false,
        roles: ['ROLE_CUSTOMER_SUPPORT_AGENT'],
      }),
    onSuccess: (res: any) => {
      setCustomerSupportAgents([
        { label: '-', value: ',' },
        { label: 'Bürokratt', value: 'chatbot' },
        ...res.data.response.map((item) => ({
          label: [item.firstName, item.lastName].join(' ').trim(),
          value: item.idCode,
        })),
      ]);
    },
  });

  const visibleColumnOptions = useMemo(
    () => [
      { label: t('chat.history.startTime'), value: 'created' },
      { label: t('chat.history.endTime'), value: 'ended' },
      { label: t('chat.history.csaName'), value: 'customerSupportFullName' },
      { label: t('global.name'), value: 'endUserName' },
      { label: t('global.idCode'), value: 'endUserId' },
      { label: t('chat.history.contact'), value: 'contactsMessage' },
      { label: t('chat.history.comment'), value: 'comment' },
      { label: t('chat.history.rating'), value: 'feedbackRating' },
      { label: t('chat.history.feedback'), value: 'feedbackText' },
      { label: t('global.status'), value: 'status' },
      { label: 'ID', value: 'id' },
      { label: 'www', value: 'www' },
    ],
    [t]
  );

  const chatStatusChangeMutation = useMutation({
    mutationFn: async (data: { chatId: string | number; event: string }) => {
      const changeableTo = [
        CHAT_EVENTS.CLIENT_LEFT_WITH_ACCEPTED.toUpperCase(),
        CHAT_EVENTS.CLIENT_LEFT_WITH_NO_RESOLUTION.toUpperCase(),
        CHAT_EVENTS.ACCEPTED.toUpperCase(),
        CHAT_EVENTS.ANSWERED.toUpperCase(),
        CHAT_EVENTS.CLIENT_LEFT_FOR_UNKNOWN_REASONS.toUpperCase(),
        CHAT_EVENTS.CLIENT_LEFT.toUpperCase(),
        CHAT_EVENTS.HATE_SPEECH.toUpperCase(),
        CHAT_EVENTS.OTHER.toUpperCase(),
        CHAT_EVENTS.TERMINATED.toUpperCase(),
        CHAT_EVENTS.RESPONSE_SENT_TO_CLIENT_EMAIL.toUpperCase(),
      ];
      const isChangeable = changeableTo.includes(data.event);

      if (selectedChat?.lastMessageEvent === data.event.toLowerCase()) return;

      if (!isChangeable) return;

      await apiDev.post('chats/status', {
        chatId: selectedChat!.id,
        event: data.event.toUpperCase(),
        authorTimestamp: new Date().toISOString(),
        authorFirstName: userInfo!.firstName,
        authorId: userInfo!.idCode,
        authorRole: userInfo!.authorities,
      });
    },
    onSuccess: () => {
      setMessagesTrigger(!messagesTrigger);
      getAllEndedChats.mutate({
        startDate: format(new Date(startDate), 'yyyy-MM-dd'),
        endDate: format(new Date(endDate), 'yyyy-MM-dd'),
        customerSupportIds: passedCustomerSupportIds,
        pagination,
        sorting,
        search,
      });
      toast.open({
        type: 'success',
        title: t('global.notification'),
        message: t('toast.success.chatStatusChanged'),
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
    mutationFn: (data: {
      chatId: string | number;
      comment: string;
      authorDisplayName: string;
    }) => apiDev.post('comments/history', data),
    onSuccess: (res, { chatId, comment }) => {
      const updatedChatList = filteredEndedChatsList.map((chat) =>
        chat.id === chatId ? { ...chat, comment } : chat
      );
      filterChatsList(updatedChatList);
      if (selectedChat)
        setSelectedChat({
          ...selectedChat,
          comment,
          commentAddedDate: res.data.response[0].created,
          commentAuthor: res.data.response[0].authorDisplayName,
        });
      toast.open({
        type: 'success',
        title: t('global.notification'),
        message: t('toast.success.chatCommentChanged'),
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

  const copyValueToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);

    toast.open({
      type: 'success',
      title: t('global.notification'),
      message: t('toast.success.copied'),
    });
  };

  const commentView = (props: any) =>
    props.getValue() && (
      <Tooltip content={props.getValue()}>
        <span
          onClick={() => copyValueToClipboard(props.getValue())}
          style={{ cursor: 'pointer' }}
        >
          {props.getValue().length <= 25
            ? props.getValue()
            : `${props.getValue()?.slice(0, 25)}...`}
        </span>
      </Tooltip>
    );

  const feedbackTextView = (props: any) => {
    const value = props.getValue() ?? '';

    return (
      <Tooltip content={value}>
        <span style={{ minWidth: '250px' }}>
          {value.length < 30 ? value : `${value?.slice?.(0, 30)}...`}
        </span>
      </Tooltip>
    );
  };

  const wwwView = (props: any) => (
    <Tooltip content={props.getValue() ?? ''}>
      <button
        onClick={() => copyValueToClipboard(props.getValue())}
        style={{ cursor: 'pointer' }}
      >
        {props.getValue() ?? ''}
      </button>
    </Tooltip>
  );

  const statusView = (props: any) => {
    const isLastMessageEvent =
      props.row.original.lastMessageEvent != null &&
      props.row.original.lastMessageEvent !== 'message-read'
        ? t('chat.plainEvents.' + props.row.original.lastMessageEvent)
        : t('chat.status.ended');
    return props.getValue() === CHAT_STATUS.ENDED ? isLastMessageEvent : '';
  };

  const idView = (props: any) => (
    <Tooltip content={props.getValue()}>
      <span
        onClick={() => copyValueToClipboard(props.getValue())}
        style={{ cursor: 'pointer' }}
      >
        {props.getValue().split('-')[0]}
      </span>
    </Tooltip>
  );

  const detailsView = (props: any) => (
    <Button
      appearance="text"
      onClick={() => {
        setSelectedChat(props.row.original);
        setChatState(props.row.original.lastMessageEvent);
      }}
    >
      <Icon icon={<MdOutlineRemoveRedEye color={'rgba(0,0,0,0.54)'} />} />
      {t('global.view')}
    </Button>
  );

  const endedChatsColumns = useMemo(
    () => [
      columnHelper.accessor('created', {
        id: 'created',
        header: t('chat.history.startTime') ?? '',
        cell: (props) =>
          format(
            new Date(props.getValue()),
            'dd.MM.yyyy HH:mm:ss',
            i18n.language === 'et' ? { locale: et } : undefined
          ),
      }),
      columnHelper.accessor('ended', {
        id: 'ended',
        header: t('chat.history.endTime') ?? '',
        cell: (props) =>
          format(
            new Date(props.getValue()),
            'dd.MM.yyyy HH:mm:ss',
            i18n.language === 'et' ? { locale: et } : undefined
          ),
      }),
      columnHelper.accessor(
        (row) =>
          `${
            row.customerSupportId === 'chatbot'
              ? row.customerSupportDisplayName
              : row.customerSupportId
              ? `${row.customerSupportFirstName ?? ''} ${
                  row.customerSupportLastName ?? ''
                }`
              : '-'
          }`,
        {
          id: `customerSupportFullName`,
          header: t('chat.history.csaName') ?? '',
        }
      ),
      columnHelper.accessor(
        (row) => `${row.endUserFirstName} ${row.endUserLastName}`,
        {
          id: `endUserName`,
          header: t('global.name') ?? '',
        }
      ),
      columnHelper.accessor('endUserId', {
        id: 'endUserId',
        header: t('global.idCode') ?? '',
      }),
      columnHelper.accessor('contactsMessage', {
        id: 'contactsMessage',
        header: t('chat.history.contact') ?? '',
        cell: (props) => (props.getValue() ? t('global.yes') : t('global.no')),
      }),
      columnHelper.accessor('comment', {
        id: 'comment',
        header: t('chat.history.comment') ?? '',
        cell: commentView,
      }),
      columnHelper.accessor('feedbackRating', {
        id: 'feedbackRating',
        header: t('chat.history.rating') ?? '',
        cell: (props) =>
          props.getValue() && <span>{`${props.getValue()}/10`}</span>,
      }),
      columnHelper.accessor('feedbackText', {
        id: 'feedbackText',
        header: t('chat.history.feedback') ?? '',
        cell: feedbackTextView,
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: t('global.status') ?? '',
        cell: statusView,
        sortingFn: (a, b, isAsc) => {
          const statusA =
            a.getValue('status') === CHAT_STATUS.ENDED
              ? t('chat.plainEvents.' + (a.original.lastMessageEvent ?? ''))
              : '';
          const statusB =
            b.getValue('status') === CHAT_STATUS.ENDED
              ? t('chat.plainEvents.' + (b.original.lastMessageEvent ?? ''))
              : '';
          return (
            statusA.localeCompare(statusB, undefined, {
              numeric: true,
              sensitivity: 'base',
            }) * (isAsc ? 1 : -1)
          );
        },
      }),
      columnHelper.accessor('id', {
        id: 'id',
        header: 'ID',
        cell: idView,
      }),
      columnHelper.accessor('endUserUrl', {
        id: 'www',
        header: 'www',
        cell: wwwView,
      }),
      columnHelper.display({
        id: 'detail',
        cell: detailsView,
        meta: {
          size: '3%',
          sticky: 'right',
        },
      }),
    ],
    []
  );

  const handleChatStatusChange = (event: string) => {
    if (!selectedChat) return;
    chatStatusChangeMutation.mutate({
      chatId: selectedChat.id,
      event: event.toUpperCase(),
    });
  };

  const handleCommentChange = (comment: string) => {
    if (!selectedChat) return;
    chatCommentChangeMutation.mutate({
      chatId: selectedChat.id,
      comment,
      authorDisplayName: userInfo!.displayName,
    });
  };

  const getFilteredColumns = () => {
    if (selectedColumns.length === 0) return endedChatsColumns;
    return endedChatsColumns.filter((c) =>
      ['detail', 'forward', ...selectedColumns].includes(c.id ?? '')
    );
  };

  const filterChatsList = (chatsList: ChatType[]) => {
    const startDate = Date.parse(
      format(new Date(control._formValues.startDate), 'MM/dd/yyyy')
    );

    const endDate = Date.parse(
      format(new Date(control._formValues.endDate), 'MM/dd/yyyy')
    );

    setFilteredEndedChatsList(
      chatsList.filter((c) => {
        const ended = Date.parse(format(new Date(c.ended), 'MM/dd/yyyy'));
        return ended >= startDate && ended <= endDate;
      })
    );
  };

  const endUserFullName = getUserName();

  if (!filteredEndedChatsList) return <>Loading...</>;

  return (
    <>
      <h1>{t('chat.history.title')}</h1>

      <Card>
        <Track gap={16}>
          <FormInput
            className="input-wrapper"
            label={t('chat.history.searchChats')}
            hideLabel
            name="searchChats"
            placeholder={t('chat.history.searchChats') + '...'}
            onChange={(e) => {
              setSearch(e.target.value);
              debouncedGetAllEnded(e.target.value);
            }}
          />
          <Track style={{ width: '100%' }} gap={16}>
            <Track gap={10}>
              <p>{t('global.from')}</p>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => {
                  return (
                    <FormDatepicker
                      {...field}
                      label={''}
                      value={field.value ?? new Date()}
                      onChange={(v) => {
                        field.onChange(v);
                        const start = format(new Date(v), 'yyyy-MM-dd');
                        setSearchParams((params) => {
                          params.set('start', start);
                          return params;
                        });
                        getAllEndedChats.mutate({
                          startDate: start,
                          endDate: format(new Date(endDate), 'yyyy-MM-dd'),
                          customerSupportIds: passedCustomerSupportIds,
                          pagination,
                          sorting,
                          search,
                        });
                      }}
                    />
                  );
                }}
              />
            </Track>
            <Track gap={10}>
              <p>{t('global.to')}</p>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => {
                  return (
                    <FormDatepicker
                      {...field}
                      label={''}
                      value={field.value ?? new Date()}
                      onChange={(v) => {
                        field.onChange(v);
                        const end = format(new Date(v), 'yyyy-MM-dd');
                        setSearchParams((params) => {
                          params.set('end', end);
                          return params;
                        });
                        getAllEndedChats.mutate({
                          startDate: format(new Date(startDate), 'yyyy-MM-dd'),
                          endDate: end,
                          customerSupportIds: passedCustomerSupportIds,
                          pagination,
                          sorting,
                          search,
                        });
                      }}
                    />
                  );
                }}
              />
            </Track>
            <FormMultiselect
              key={counterKey}
              name="visibleColumns"
              label={t('')}
              placeholder={t('chat.history.chosenColumn')}
              options={visibleColumnOptions}
              selectedOptions={visibleColumnOptions.filter((o) =>
                selectedColumns.includes(o.value)
              )}
              onSelectionChange={(selection) => {
                const columns = selection?.map((s) => s.value) ?? [];
                setSelectedColumns(columns);
                updatePagePreferences.mutate({
                  page_results: pagination.pageSize,
                  selected_columns: columns,
                });
              }}
            />
            <FormMultiselect
              name="agent"
              label={t('')}
              placeholder={t('chat.history.chosenCsa')}
              options={customerSupportAgents}
              selectedOptions={customerSupportAgents.filter((item) =>
                passedCustomerSupportIds.includes(item.value)
              )}
              onSelectionChange={(selection) => {
                setSearchParams((params) => {
                  params.delete('customerSupportIds');
                  params.set('page', '1');
                  selection?.forEach((s) =>
                    params.append('customerSupportIds', s.value)
                  );
                  return params;
                });

                setPagination({ pageIndex: 0, pageSize: pagination.pageSize });

                getAllEndedChats.mutate({
                  startDate,
                  endDate,
                  customerSupportIds: selection?.map((s) => s.value) || [],
                  pagination: { pageIndex: 0, pageSize: pagination.pageSize },
                  sorting,
                  search,
                });
              }}
            />
          </Track>
        </Track>
      </Card>

      <div className="card-drawer-container">
        <div className="card-wrapper">
          <Card>
            <DataTable
              data={filteredEndedChatsList}
              sortable
              columns={getFilteredColumns()}
              selectedRow={(row) => row.original.id === selectedChat?.id}
              pagination={pagination}
              columnPinning={columnPinning}
              sorting={sorting}
              setPagination={(state: PaginationState) => {
                if (
                  state.pageIndex === pagination.pageIndex &&
                  state.pageSize === pagination.pageSize
                )
                  return;
                setPagination(state);
                updatePagePreferences.mutate({
                  page_results: state.pageSize,
                  selected_columns: selectedColumns,
                });
                getAllEndedChats.mutate({
                  startDate: format(new Date(startDate), 'yyyy-MM-dd'),
                  endDate: format(new Date(endDate), 'yyyy-MM-dd'),
                  customerSupportIds: passedCustomerSupportIds,
                  pagination: state,
                  sorting,
                  search,
                });
              }}
              setSorting={(state: SortingState) => {
                setSorting(state);
                getAllEndedChats.mutate({
                  startDate: format(new Date(startDate), 'yyyy-MM-dd'),
                  endDate: format(new Date(endDate), 'yyyy-MM-dd'),
                  customerSupportIds: passedCustomerSupportIds,
                  pagination,
                  sorting: state,
                  search,
                });
              }}
              isClientSide={false}
              pagesCount={totalPages}
            />
          </Card>
        </div>

        {selectedChat && (
          <>
            <div className="drawer-container">
              <Drawer
                title={
                  selectedChat.endUserFirstName !== '' &&
                  selectedChat.endUserLastName !== ''
                    ? `${selectedChat.endUserFirstName} ${selectedChat.endUserLastName}`
                    : t('global.anonymous')
                }
                onClose={() => setSelectedChat(null)}
              >
                <HistoricalChat
                  chat={selectedChat}
                  trigger={messagesTrigger}
                  onChatStatusChange={setStatusChangeModal}
                  selectedStatus={chatState}
                  onCommentChange={handleCommentChange}
                />
              </Drawer>
            </div>
            <div className="side-meta">
              <div>
                <p>
                  <strong>ID</strong>
                </p>
                <p>{selectedChat.id}</p>
              </div>
              <div>
                <p>
                  <strong>{t('chat.endUser')}</strong>
                </p>
                <p>{endUserFullName}</p>
              </div>
              {selectedChat.endUserId && (
                <div>
                  <p>
                    <strong>{t('chat.endUserId')}</strong>
                  </p>
                  <p>{selectedChat.endUserId ?? ''}</p>
                </div>
              )}
              {selectedChat.endUserEmail && (
                <div>
                  <p>
                    <strong>{t('chat.endUserEmail')}</strong>
                  </p>
                  <p>{selectedChat.endUserEmail}</p>
                </div>
              )}
              {selectedChat.endUserPhone && (
                <div>
                  <p>
                    <strong>{t('chat.endUserPhoneNumber')}</strong>
                  </p>
                  <p>{selectedChat.endUserPhone}</p>
                </div>
              )}
              {selectedChat.customerSupportDisplayName && (
                <div>
                  <p>
                    <strong>{t('chat.csaName')}</strong>
                  </p>
                  <p>{selectedChat.customerSupportDisplayName}</p>
                </div>
              )}
              <div>
                <p>
                  <strong>{t('chat.startedAt')}</strong>
                </p>
                <p>
                  {format(
                    new Date(selectedChat.created),
                    'dd. MMMM Y HH:mm:ss',
                    {
                      locale: et,
                    }
                  ).toLowerCase()}
                </p>
              </div>
              <div>
                <p>
                  <strong>{t('chat.device')}</strong>
                </p>
                <p>{selectedChat.endUserOs}</p>
              </div>
              <div>
                <p>
                  <strong>{t('chat.location')}</strong>
                </p>
                <p>{selectedChat.endUserUrl}</p>
              </div>
              {selectedChat.comment && (
                <div>
                  <p>
                    <strong>{t('chat.history.comment')}</strong>
                  </p>
                  <p>{selectedChat.comment}</p>
                </div>
              )}
              {selectedChat.commentAuthor && (
                <div>
                  <p>
                    <strong>{t('chat.history.commentAuthor')}</strong>
                  </p>
                  <p>{selectedChat.commentAuthor}</p>
                </div>
              )}
              {selectedChat.commentAddedDate && (
                <div>
                  <p>
                    <strong>{t('chat.history.commentAddedDate')}</strong>
                  </p>
                  <p>
                    {format(
                      new Date(selectedChat.commentAddedDate),
                      'dd.MM.yyyy'
                    )}
                  </p>
                </div>
              )}
              {selectedChat.lastMessageEvent && (
                <div>
                  <p>
                    <strong>{t('global.status')}</strong>
                  </p>
                  <p>
                    {t('chat.plainEvents.' + selectedChat.lastMessageEvent)}
                  </p>
                </div>
              )}
              {selectedChat.userDisplayName && (
                <div>
                  <p>
                    <strong>{t('chat.history.statusAdder')}</strong>
                  </p>
                  <p>{selectedChat.userDisplayName}</p>
                </div>
              )}
              {selectedChat.lastMessageTimestamp && (
                <div>
                  <p>
                    <strong>{t('chat.history.statusAddedDate')}</strong>
                  </p>
                  <p>
                    {format(
                      new Date(selectedChat.lastMessageTimestamp),
                      'dd.MM.yyyy'
                    )}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {statusChangeModal && (
        <Dialog
          title={t('chat.changeStatus')}
          onClose={() => setStatusChangeModal(null)}
          footer={
            <>
              <Button
                appearance="secondary"
                onClick={() => {
                  setChatState(null);
                  setStatusChangeModal(null);
                }}
              >
                {t('global.cancel')}
              </Button>
              <Button
                appearance="error"
                onClick={() => {
                  setChatState(statusChangeModal);
                  handleChatStatusChange(statusChangeModal);
                }}
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

  function getUserName() {
    return selectedChat?.endUserFirstName !== '' &&
      selectedChat?.endUserLastName !== ''
      ? `${selectedChat?.endUserFirstName} ${selectedChat?.endUserLastName}`
      : t('global.anonymous');
  }
};

export default withAuthorization(ChatHistory, [
  ROLES.ROLE_ADMINISTRATOR,
  ROLES.ROLE_CUSTOMER_SUPPORT_AGENT,
]);
