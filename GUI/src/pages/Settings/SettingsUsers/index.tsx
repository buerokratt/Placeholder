import { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ColumnFiltersState,
  PaginationState,
  Row,
  SortingState,
  createColumnHelper,
} from '@tanstack/react-table';
import { AxiosError } from 'axios';
import { MdOutlineEdit, MdOutlineDeleteOutline } from 'react-icons/md';
import { apiDev } from 'services/api';
import { Button, Card, DataTable, Dialog, Icon, Track } from 'components';
import { User, UserSearchFilters } from 'types/user';
import { deleteUser } from 'services/users';
import { useToast } from 'hooks/useToast';
import UserModal from './UserModal';
import { ROLES } from 'utils/constants';
import withAuthorization from 'hoc/with-authorization';
import { CustomerSupportActivityDTO } from 'types/customerSupportActivity';
import useStore from '../../../store';

const SettingsUsers: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const userInfo = useStore((state) => state.userInfo);
  const [newUserModal, setNewUserModal] = useState(false);
  const [changeStatusDialog, setChangeStatusDialog] = useState(false);
  const [editableRow, setEditableRow] = useState<User | null>(null);
  const [deletableRow, setDeletableRow] = useState<string | number | null>(
    null
  );
  const [usersList, setUsersList] = useState<User[] | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);

  const getUsers = (
    pagination: PaginationState,
    sorting: SortingState,
    columnFilters: ColumnFiltersState,
    setTablePagination: boolean = false
  ) => {
    const sort =
      sorting.length === 0
        ? 'name asc'
        : sorting[0].id + ' ' + (sorting[0].desc ? 'desc' : 'asc');
    const searchfilters = checkFilters(columnFilters);
    apiDev
      .post(`accounts/customer-support-agents`, {
        page: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        sorting: sort,
        search_full_name: searchfilters.search_full_name,
        search_id_code: searchfilters.search_id_code,
        search_display_name: searchfilters.search_display_name,
        search_csa_title: searchfilters.search_csa_title,
        search_csa_email: searchfilters.search_csa_email,
        search_authority: searchfilters.search_authority,
      })
      .then((res: any) => {
        setUsersList(res?.data?.response ?? []);
        setTotalPages(res?.data?.response[0]?.totalPages ?? 1);
        if (setTablePagination) {
          setPagination(pagination);
        }
      })
      .catch((error: any) => console.log(error));
  };

  useEffect(() => {
    getUsers(pagination, sorting, columnFilters);
  }, []);

  useEffect(() => {
    fetchData();
  }, [userInfo?.idCode]);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const columnHelper = createColumnHelper<User>();

  const fetchData = async () => {
    try {
      const response = await apiDev.get('/accounts/get-page-preference', {
        params: {
          user_id: userInfo?.idCode,
          page_name: window.location.pathname,
        },
      });
      if (response.data.pageResults !== undefined) {
        updatePagePreference(response.data.pageResults);
      } else {
        getUsers(pagination, sorting, columnFilters);
      }
    } catch (err) {
      console.error('Failed to fetch data');
    }
  };

  const updatePagePreference = (pageResults: number): void => {
    const updatedPagination = { ...pagination, pageSize: pageResults };
    setPagination(updatedPagination);
    getUsers(updatedPagination, sorting, columnFilters);
  };

  const updatePageSize = useMutation({
    mutationFn: (data: { page_results: number }) => {
      return apiDev.post('accounts/update-page-preference', {
        user_id: userInfo?.idCode,
        page_name: window.location.pathname,
        page_results: data.page_results,
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: ({ id }: { id: string | number }) => deleteUser(id),
    onSuccess: async () => {
      getUsers(pagination, sorting, columnFilters);
      toast.open({
        type: 'success',
        title: t('global.notification'),
        message: t('toast.success.userDeleted'),
      });
      setDeletableRow(null);
    },
    onError: (error: AxiosError) => {
      toast.open({
        type: 'error',
        title: t('global.notificationError'),
        message: error.message,
      });
    },
  });

  const customerSupportActivityMutation = useMutation({
    mutationFn: (data: CustomerSupportActivityDTO) =>
      apiDev.post('accounts/customer-support-activity', {
        customerSupportActive: data.customerSupportActive,
        customerSupportStatus: data.customerSupportStatus,
      }),
    onSuccess: async () => {
      getUsers(pagination, sorting, columnFilters);
      toast.open({
        type: 'success',
        title: t('global.notification'),
        message: t('toast.success.userUpdated'),
      });
      setChangeStatusDialog(false);
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

  const editView = (props: any) => (
    <Button
      appearance="text"
      onClick={() => setEditableRow(props.row.original)}
    >
      <Icon icon={<MdOutlineEdit />} />
      {t('global.edit')}
    </Button>
  );

  const deleteView = (props: any) => (
    <Button
      appearance="text"
      onClick={() => setDeletableRow(props.row.original.idCode)}
    >
      <Icon icon={<MdOutlineDeleteOutline />} />
      {t('global.delete')}
    </Button>
  );

  const checkFilters = (state: ColumnFiltersState) => {
    const searchfilters: UserSearchFilters = {
      search_full_name: '',
      search_id_code: '',
      search_display_name: '',
      search_csa_title: '',
      search_csa_email: '',
      search_authority: '',
    };
    for (const filter of state) {
      switch (filter.id) {
        case 'name':
          searchfilters.search_full_name = (filter.value as string) ?? '';
          break;
        case 'idCode':
          searchfilters.search_id_code = (filter.value as string) ?? '';
          break;
        case 'displayName':
          searchfilters.search_display_name = (filter.value as string) ?? '';
          break;
        case 'csaTitle':
          searchfilters.search_csa_title = (filter.value as string) ?? '';
          break;
        case 'csaEmail':
          searchfilters.search_csa_email = (filter.value as string) ?? '';
          break;
        case 'Role':
          searchfilters.search_authority = (filter.value as string) ?? '';
          break;
        default:
          break;
      }
    }
    return searchfilters;
  };

  const customerSupportStatusView = (props: any) => {
    const isIdle = props.getValue() === 'idle' ? '#FFB511' : '#D73E3E';
    return (
      <Button
        appearance="text"
        onClick={() => {
          if (props.getValue() === 'online' || props.getValue() === 'idle')
            setChangeStatusDialog(true);
        }}
        style={{
          borderRadius: '50%',
          color: 'white',
        }}
      >
        <span
          style={{
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'block',
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: props.getValue() === 'online' ? '#308653' : isIdle,
          }}
        ></span>
      </Button>
    );
  };

  const usersColumns = useMemo(
    () => [
      columnHelper.accessor(
        (row) => `${row.firstName ?? ''} ${row.lastName ?? ''}`,
        {
          id: `name`,
          header: t('settings.users.name') ?? '',
        }
      ),
      columnHelper.accessor('idCode', {
        header: t('settings.users.idCode') ?? '',
      }),
      columnHelper.accessor(
        (data: { authorities: ROLES[] }) => {
          const output: string[] = [];
          data.authorities?.map?.((role) => {
            return output.push(t(`roles.${role}`));
          });
          return output;
        },
        {
          header: t('settings.users.role') ?? '',
          cell: (props) => props.getValue().join(', '),
          filterFn: (row: Row<User>, _, filterValue) => {
            const rowAuthorities: string[] = [];
            row.original.authorities.map((role) => {
              return rowAuthorities.push(t(`roles.${role}`));
            });
            const filteredArray = rowAuthorities.filter((word) =>
              word.toLowerCase().includes(filterValue.toLowerCase())
            );
            return filteredArray.length > 0;
          },
        }
      ),
      columnHelper.accessor('displayName', {
        header: t('settings.users.displayName') ?? '',
      }),
      columnHelper.accessor('csaTitle', {
        header: t('settings.users.userTitle') ?? '',
      }),
      columnHelper.accessor('customerSupportStatus', {
        header: t('global.status') ?? '',
        enableColumnFilter: false,
        cell: customerSupportStatusView,
      }),
      columnHelper.accessor('csaEmail', {
        header: t('settings.users.email') ?? '',
      }),
      columnHelper.display({
        id: 'edit',
        cell: editView,
        meta: {
          size: '1%',
        },
      }),
      columnHelper.display({
        id: 'delete',
        cell: deleteView,
        meta: {
          size: '1%',
        },
      }),
    ],
    []
  );

  if (!usersList) return <>Loading...</>;

  return (
    <>
      <Track gap={16} justify="between" style={{ paddingBottom: '10px' }}>
        <h1>{t('settings.users.title')}</h1>
        <Button onClick={() => setNewUserModal(true)}>
          {t('settings.users.addUser')}
        </Button>
      </Track>

      <Card>
        <DataTable
          data={usersList}
          columns={usersColumns}
          sortable
          filterable
          pagination={pagination}
          columnFilters={columnFilters}
          setPagination={(state: PaginationState) => {
            if (
              state.pageIndex === pagination.pageIndex &&
              state.pageSize === pagination.pageSize
            )
              return;
            setPagination(state);
            updatePageSize.mutate({ page_results: state.pageSize });
            getUsers(state, sorting, columnFilters);
          }}
          sorting={sorting}
          setSorting={(state: SortingState) => {
            setSorting(state);
            getUsers(pagination, state, columnFilters);
          }}
          setFiltering={(state: ColumnFiltersState) => {
            setColumnFilters(state);
            const searchfilters = checkFilters(state);
            const hasData = Object.values(searchfilters).some(
              (value) => value !== ''
            );

            if (hasData) {
              const intialPagination = { pageIndex: 0, pageSize: 10 };
              getUsers(intialPagination, sorting, state, true);
            } else {
              getUsers(pagination, sorting, state);
            }
          }}
          pagesCount={totalPages}
          isClientSide={false}
        />
      </Card>

      {newUserModal && (
        <UserModal
          onClose={() => {
            setNewUserModal(false);
            getUsers(pagination, sorting, columnFilters);
          }}
        />
      )}

      {changeStatusDialog && (
        <Dialog
          title={t('settings.users.userChangeStatusMessage')}
          onClose={() => setChangeStatusDialog(false)}
          footer={
            <>
              <Button
                appearance="secondary"
                onClick={() => setChangeStatusDialog(false)}
              >
                {t('global.no')}
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  customerSupportActivityMutation.mutate({
                    customerSupportActive: false,
                    customerSupportStatus: 'offline',
                  });
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

      {editableRow && (
        <UserModal
          user={editableRow}
          onClose={() => {
            setEditableRow(null);
            getUsers(pagination, sorting, columnFilters);
          }}
        />
      )}

      {deletableRow !== null && (
        <Dialog
          title={t('settings.users.deleteUser')}
          onClose={() => setDeletableRow(null)}
          footer={
            <>
              <Button
                appearance="secondary"
                onClick={() => setDeletableRow(null)}
              >
                {t('global.no')}
              </Button>
              <Button
                appearance="error"
                onClick={() => deleteUserMutation.mutate({ id: deletableRow })}
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

export default withAuthorization(SettingsUsers, [ROLES.ROLE_ADMINISTRATOR]);
