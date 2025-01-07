import { ROLES } from 'utils/constants';

export interface User {
  login?: string;
  fullName?: string;
  firstName: string;
  lastName: string;
  idCode: string;
  displayName: string;
  csaTitle: string;
  csaEmail: string;
  authorities: ROLES[];
  customerSupportStatus: 'online' | 'idle' | 'offline';
  department: string;
  jiraAccountId?: string;
}

export interface UserDTO
  extends Pick<
    User,
    | 'login'
    | 'firstName'
    | 'lastName'
    | 'fullName'
    | 'idCode'
    | 'authorities'
    | 'displayName'
    | 'csaTitle'
    | 'csaEmail'
    | 'department'
    | 'jiraAccountId'
  > {}

export interface UserSearchFilters {
  search_full_name: string;
  search_id_code: string;
  search_display_name: string;
  search_csa_title: string;
  search_csa_email: string;
  search_authority: string;
  search_department: string;
}
