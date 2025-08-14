import React from "react";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Box,
  InputAdornment,
  Menu,
  IconButton,
  ListItemIcon,
  ListItemText,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import {
  Description,
  Autorenew,
  Article,
} from "@mui/icons-material";
import { BsBank } from "react-icons/bs";
import AutoSelectionSearch from "../../../BasicComponents/AutoSelectionSearch";
import CalculationLoader from "../../../BasicComponents/ContentLoader/CalculationLoader";
import {
  Option,
  PAYMENT_TYPES,
  INVOICE_TERMS,
} from "./type";

interface InvoiceDetailsProps {
  form: any;
  formErrors: any;
  invoiceDate: dayjs.Dayjs;
  invoiceMenuAnchorEl: HTMLElement | null;
  bankOptions: Option[];
  termsOptions: Option[];
  invoiceData: any;
  isLoadings: boolean;
  globalInputs: any;
  orgType: string;
  orgList: any[];
  billedTo: string | null;
  orgListLoading: boolean;
  invoiceId: string | undefined;
  isCloning: boolean;
  fromNomination: boolean;
  invoiceDateWarning: string | null;
  users: any;
  operatorTransactionId: string | undefined;
  id: string | undefined;
  onFormChange: (field: string, value: any) => void;
  onInvoiceMenuAnchorElChange: (anchorEl: HTMLElement | null) => void;
  onOrgTypeChange: (e: any) => void;
  onBilledToChange: (orgId: string | null, chartererDetailsId?: number | null) => void;
  onShowAddOrgDialog: () => void;
  onInvoiceDateChange: (newValue: dayjs.Dayjs | null) => void;
  onViewTerms: () => void;
  formatETA: (eta: any) => string;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  form,
  formErrors,
  invoiceDate,
  invoiceMenuAnchorEl,
  bankOptions,
  termsOptions,
  invoiceData,
  isLoadings,
  globalInputs,
  orgType,
  orgList,
  billedTo,
  orgListLoading,
  invoiceId,
  isCloning,
  fromNomination,
  invoiceDateWarning,
  users,
  operatorTransactionId,
  id,
  onFormChange,
  onInvoiceMenuAnchorElChange,
  onOrgTypeChange,
  onBilledToChange,
  onShowAddOrgDialog,
  onInvoiceDateChange,
  onViewTerms,
  formatETA,
}) => {
  return (
    <Box sx={{ fontFamily: "Inter, sans-serif" }}>
      <Typography variant="h6" sx={{ fontFamily: "Inter, sans-serif" }}>
        Portcall Details
      </Typography>
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4 overflow-hidden">
        <div className="flex items-center max-w-xs overflow-hidden whitespace-nowrap">
          <label className="font-semibold mr-1 shrink-0">Port:</label>
          {isLoadings ? (
            <span className="text-nowrap">
              <CalculationLoader />
            </span>
          ) : (
            <span className="truncate">
              {invoiceData?.userTransactionsDto?.port || ""},
              <span className="text-gray-600">
                {invoiceData?.userTransactionsDto?.country || ""}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center max-w-xs overflow-hidden whitespace-nowrap">
          <label className="font-semibold mr-1 shrink-0">Vessel:</label>
          {isLoadings ? (
            <span className="text-nowrap">
              <CalculationLoader />
            </span>
          ) : (
            <span className="truncate">
              {invoiceData?.userTransactionsDto?.vesselName || ""}
              <span className="text-gray-600">
                ( {invoiceData?.userTransactionsDto?.vesselImo || ""})
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center max-w-xs overflow-hidden whitespace-nowrap">
          <label className="font-semibold mr-1 shrink-0">ETA:</label>
          {isLoadings ? (
            <span className="text-nowrap">
              <CalculationLoader />
            </span>
          ) : (
            <span className="truncate">
              {formatETA(invoiceData?.userTransactionsDto?.eta) || ""}
            </span>
          )}
        </div>

        <div className="flex items-center max-w-xs overflow-hidden whitespace-nowrap">
          <label className="font-semibold mr-1 shrink-0">Operation:</label>
          {isLoadings ? (
            <span className="shrink-0">
              <CalculationLoader />
            </span>
          ) : (
            <span className="truncate overflow-hidden text-ellipsis">
              {[
                ...new Set(
                  globalInputs?.cargoDetails
                    ?.map((item: { activity?: { label: string } }) => item.activity?.label)
                    .filter(Boolean)
                ),
              ]?.join(", ") || "Operation Not Available"}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span className="mt-2">Billed To:</span>
          <FormControl size="small" sx={{ minWidth: 160 }} required>
            <InputLabel id="org-type-label">Organization Type</InputLabel>
            <Select
              labelId="org-type-label"
              label="Organization Type"
              value={orgType}
              onChange={onOrgTypeChange}
            >
              {[
                { label: "Agency", value: "OT001" },
                { label: "Charterer", value: "OT003" },
                { label: "Operator", value: "OT002" },
              ].map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <div
            style={{
              minWidth: 250,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Autocomplete
              size="small"
              options={[
                ...orgList?.filter(org => String(org.organisationId) !== String(users?.organisationId)),
                { organisationId: "other", organisationName: "Other" },
              ]}
              value={
                billedTo === "other"
                  ? { organisationId: "other", organisationName: "Other" }
                  : orgList.find(
                      (org) => org.organisationId === billedTo
                    ) || null
              }
              onChange={(_, newValue) => {
                const orgId = newValue?.organisationId || "";

                if (orgId === "other") {
                  onBilledToChange("other");
                  onShowAddOrgDialog();
                } else {
                  onBilledToChange(orgId || null, newValue?.chartererDetailsId || null);
                }
              }}
              getOptionLabel={(option) => option.organisationName || ""}
              isOptionEqualToValue={(option, value) =>
                option.organisationId === value.organisationId
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Organization"
                  variant="outlined"
                  disabled={!orgType || orgListLoading}
                  error={!!formErrors.billedTo}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {orgListLoading ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            {formErrors.billedTo && (
              <Typography
                color="error"
                variant="caption"
                sx={{
                  mt: 0.5,
                  ml: 0.5,
                  display: "block",
                  position: "relative",
                }}
              >
                {formErrors.billedTo}
              </Typography>
            )}
          </div>
        </div>
      </div>

      <Typography
        variant="h6"
        sx={{ mt: 2, mb: 1, fontFamily: "Inter, sans-serif" }}
      >
        Invoice Details
      </Typography>
      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12} md={4}>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <FormControl
                fullWidth
                size="small"
                sx={{ fontFamily: "Inter, sans-serif" }}
                error={!!formErrors.invoiceType}
              >
                <InputLabel sx={{ fontFamily: "Inter, sans-serif" }}>
                  Invoice Type
                </InputLabel>
                <Select
                  value={form.invoiceType}
                  label="Invoice Type"
                  onChange={(e) =>
                    onFormChange("invoiceType", e.target.value)
                  }
                  disabled={(!!invoiceId && !isCloning) || fromNomination}
                >
                  {PAYMENT_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.invoiceType && (
                  <Typography color="error" variant="caption">
                    {formErrors.invoiceType}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            {form.invoiceType === "OTH" && (
              <Grid item>
                <TextField
                  fullWidth
                  label="Specify Other Type"
                  onChange={(e) =>
                    onFormChange(
                      "otherSpecifiedInvoiceType",
                      e.target.value
                    )
                  }
                  size="small"
                  value={form.otherSpecifiedInvoiceType}
                  sx={{ fontFamily: "Inter, sans-serif" }}
                  InputLabelProps={{
                    sx: { fontFamily: "Inter, sans-serif" },
                  }}
                />
              </Grid>
            )}
          </Grid>
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Invoice Number"
            value={form.invoiceNumber}
            onChange={(e) =>
              onFormChange("invoiceNumber", e.target.value)
            }
            size="small"
            sx={{ fontFamily: "Inter, sans-serif" }}
            InputProps={{
              readOnly:
                form.invoiceNumberType === "auto" ||
                (!!invoiceId && !isCloning),
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton
                    aria-label="invoice number options"
                    onClick={(event) => {
                      onInvoiceMenuAnchorElChange(event.currentTarget);
                    }}
                    edge="start"
                    disabled={!!invoiceId && !isCloning}
                  >
                    {form.invoiceNumberType === "auto" ? (
                      <Autorenew />
                    ) : (
                      <Description />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Menu
            anchorEl={invoiceMenuAnchorEl}
            open={Boolean(invoiceMenuAnchorEl)}
            onClose={() => onInvoiceMenuAnchorElChange(null)}
          >
            <MenuItem
              onClick={() => {
                onFormChange("invoiceNumberType", "auto");
                onInvoiceMenuAnchorElChange(null);
              }}
              disabled={!!invoiceId && !isCloning}
            >
              <ListItemIcon>
                <Autorenew fontSize="small" />
              </ListItemIcon>
              <ListItemText>Auto Generate</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                onFormChange("invoiceNumberType", "manual");
                onFormChange("invoiceNumber", "");
                onInvoiceMenuAnchorElChange(null);
              }}
              disabled={!!invoiceId && !isCloning}
            >
              <ListItemIcon>
                <Description fontSize="small" />
              </ListItemIcon>
              <ListItemText>Enter Manually</ListItemText>
            </MenuItem>
          </Menu>
        </Grid>
        <Grid item xs={12} md={4}>
          {bankOptions?.length > 0 ? (
            <AutoSelectionSearch
              options={bankOptions}
              onChange={(
                _: React.ChangeEvent<{}>,
                value: Option | Option[] | null
              ) =>
                onFormChange("selectedBank", value as Option | null)
              }
              value={form.selectedBank}
              forceFullWidth={true}
              isClass={true}
              placeholder="Bank Account"
              startAdornment={<BsBank className="text-gray-600" />}
            />
          ) : (
            <div className="text-gray-500">
              Please add bank details in organization
            </div>
          )}
        </Grid>
        <Grid item xs={8} md={1.4}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Invoice Date"
              value={invoiceDate}
              onChange={onInvoiceDateChange}
              format="YYYY-MM-DD"
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  variant: "standard",
                  sx: { fontFamily: "Inter, sans-serif" },
                  InputLabelProps: {
                    sx: { fontFamily: "Inter, sans-serif" },
                  },
                  helperText: invoiceDateWarning,
                  error: Boolean(invoiceDateWarning),
                },
              }}
            />
          </LocalizationProvider>
        </Grid>

        <Grid item xs={8} md={2.5}>
          <FormControl
            fullWidth
            size="small"
            sx={{ fontFamily: "Inter, sans-serif" }}
            error={!!formErrors.selectedTerm}
          >
            <InputLabel sx={{ fontFamily: "Inter, sans-serif" }}>
              Invoice Terms
            </InputLabel>
            <Select
              value={form.selectedTerm}
              label="Invoice Terms"
              variant="standard"
              onChange={(e) => {
                onFormChange("selectedTerm", e.target.value);
              }}
              sx={{ fontFamily: "Inter, sans-serif" }}
            >
              {INVOICE_TERMS?.map((term) => (
                <MenuItem
                  key={term.code}
                  value={term.code}
                  sx={{ fontFamily: "Inter, sans-serif" }}
                >
                  {term.label}
                </MenuItem>
              ))}
            </Select>
            {formErrors.selectedTerm && (
              <Typography color="error" variant="caption">
                {formErrors.selectedTerm}
              </Typography>
            )}
          </FormControl>
        </Grid>
        <Grid item xs={8} md={1.4}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Due Date"
              value={form.dueDate}
              onChange={(newValue) => {
                if (newValue) {
                  onFormChange("dueDate", newValue);
                  onFormChange("selectedTerm", "INVTERM008");
                }
              }}
              format="YYYY-MM-DD"
              minDate={form.invoiceDate}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  variant: "standard",
                  sx: { fontFamily: "Inter, sans-serif" },
                  InputLabelProps: {
                    sx: { fontFamily: "Inter, sans-serif" },
                  },
                },
              }}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>

      {/* Recurring Invoice Details */}
      {form.recurringInvoiceDto && (
        <Box sx={{ py: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: 'Inter, sans-serif', mt: 2, mb: 1 }}>
            Recurring Invoice Details
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={form.recurringInvoiceDto?.startOn}
                  onChange={val => onFormChange("recurringInvoiceDto", { ...form.recurringInvoiceDto, startOn: val })}
                  format="YYYY-MM-DD"
                  slotProps={{ textField: { fullWidth: true, size: 'small', variant: 'standard', sx: { fontFamily: 'Inter, sans-serif' } } }}
                />
              </LocalizationProvider>
            </Grid>
            {/* Add other recurring fields as needed */}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default InvoiceDetails;