export type CustomerSupportActivityDTO = {
  customerSupportActive: boolean;
  customerSupportStatus: 'offline' | 'idle' | 'online';
  customerSupportId: string;
};
