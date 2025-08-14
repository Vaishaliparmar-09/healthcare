import React, { useState, useEffect, useMemo } from "react";
import {
  FormControlLabel,
  Checkbox,
  Box,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { notificationToaster } from "../../../../../../store/slices/common/commonSlice";
import { useParams } from "react-router-dom";
import CustomizedDialogs from "../../../../../../components/CustomizedDialogs";
import { setActiveTab } from "../store";
import { useAppSelector } from "../../../../../../store";
import {
  getOrganisationByOrgId,
  getTermsByPort,
  apiGetOrgListByOrgType,
  apiGetChartererList
} from "../../../../../../services/orgAdminAPIService";
import { AxiosResponse } from "axios";
import InvoicePreview from "./InvoicePreview";
import {
  ServiceItem,
  OrganisationData,
  TermsAndCondition,
  InvoiceProps,
  Option,
  INVOICE_TERMS,
  PAYMENT_TYPES,
  INVOICE_LINE_ITEMS,
  INVOICE_STATUS,
  AdvancePaymentResponse,
} from "./type";
import { APIGetAllAnciallyCharges } from "../../../../../../services/AncillaryCharges/AncillaryCharges";
import AncillaryCharges from "../AncillaryCharges/AncillaryCharges";
import { apiCurrencyConvertor } from "../../../../../../services/Currency/CurrencyService";
import {
  APIGetInvoiceNumber,
  APIGetInvoiceByTransaction,
  ApiCreateInvoice,
  APIGetInvoiceById,
  ApiUpdateInvoice,
  GeneratePDFLink,
} from "../../../../../../services/InvoiceManagement/InvoiceManagement";
import { selectTransactionId } from "../../../../store";
import { apiGetAdvancePayment } from "../../../../../../services/WorkFlow/PdaRequest";
import AddNewOrgBilledTo from "./AddNewOrgBilledTo";
import Loading from "../../../../../../components/shared/Loading";
import {
  AGENCY,
  AGENT,
  ORG_ADMIN,
} from "../../../../../../constants/roleConstant";
import InvoiceActionButtons from "./InvoiceActionButtons";

// Import the new sub-components
import InvoiceDetails from "./InvoiceDetails";
import InvoiceItemsTable from "./InvoiceItemsTable";
import InvoiceCalculations from "./InvoiceCalculations";

// UUID generation function
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const Invoice: React.FC<InvoiceProps & { fromNomination?: boolean, isRecurring?: boolean }> = ({
  open,
  onClose,
  invoiceId,
  fromNomination,
  isCloning,
  agentTransactionId,
  operatorTransactionId,
  isRecurring = false,
}) => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const users = useSelector((state: any) => state.auth.user);
  const portCode = useSelector(
    (state: any) => state?.pda?.globalInputs?.port?.value
  );

  const [invoiceDate, setInvoiceDate] = useState(dayjs());
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(null);
  const globalInputs = useSelector((state: any) => state?.pda?.globalInputs);
  const [invoiceMenuAnchorEl, setInvoiceMenuAnchorEl] =
    useState<null | HTMLElement>(null);
  const [itemMenuAnchorEl, setItemMenuAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [rowsWithSections, setRowsWithSections] = useState<Set<string>>(
    new Set()
  );
  const userName = useSelector((state: any) => state.auth.user.email);
  const userRole: string = useAppSelector(
    (user: any) => user.auth.user.authority[0].roleName
  );
  const organTypeCode: string = useAppSelector(
    (user: any) => user.auth.user.organisationTypeCode
  );

  const [isPaymentReceived, setIsPaymentReceived] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<
    Array<{
      id: string;
      paymentMode: string;
      depositTo: string;
      amount: number;
    }>
  >([{ id: "1", paymentMode: "", depositTo: "", amount: 0 }]);

  const [agentReqAmount, setAgentReqAmount] = useState<number | null>(null);
  const [pdaValue, setPdaValue] = useState<number | null>(null);
  const [agentReqPercentage, setAgentReqPercentage] = useState<number | null>(null);
  const [advancedPayment, setAdvancedPayment] = useState();

  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [importSource, setImportSource] = useState(false);
  const [isLoadings, setIsLoadings] = useState(false);

  const [form, setForm] = useState({
    invoiceType: "",
    otherSpecifiedInvoiceType: "",
    invoiceNumberType: "auto",
    invoiceNumber: "",
    displayInvoiceNumber: "",
    billedToOrgId: "",
    billedByOrgId: users?.organizationId,
    bankAccount: "",
    selectedBank: null,
    invoiceDate: null,
    dueDate: null,
    parentInvoiceId: null,
    selectedTerm: "",
    selectedTerms: [],
    customerNotes: "",
    discountValue: "",
    discountType: "%",
    taxValue: "",
    taxType: "%",
    adjustment: "",
    currencyCode: "",
    showServicesSummary: true,
    startOn: dayjs(),
    recurringInvoiceDto: null,
    endOn: null,
    repeatUnit: null,
    repeatInterval: 'Months',
    neverExpires: false,
    attachments: []
  });
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [bankOptions, setBankOptions] = useState<Option[]>([]);
  const [termsOptions, setTermsOptions] = useState<Option[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [openTandC, setOpenTandC] = useState<{
    isOpen: boolean;
    termsData: any[];
  }>({
    isOpen: false,
    termsData: [],
  });
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const [invoiceDateWarning, setInvoiceDateWarning] = useState<string | null>(
    null
  );

  const TransactionId = useSelector(selectTransactionId);

  const [ancillaryCharges, setAncillaryCharges] = useState<
    Array<{
      ancillaryChargeId: number;
      ancillaryChargeName: string;
      ancillaryChargeCost: number;
      ancillaryChargeCurrency: string;
      ancillaryChargeType: string;
      ancillaryChargeTypeDescription: string;
      ancillaryChargeUnit: string;
      ancillaryChargeUnitDescription: string;
      ancillaryChargeDescription: string;
      status: string;
      statusDescription: string;
    }>
  >([]);
  const [showAncillaryChargesDialog, setShowAncillaryChargesDialog] =
    useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<string>("");

  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);

  const [orgType, setOrgType] = useState("");
  const [orgList, setOrgList] = useState<any[]>([]);
  const [billedTo, setBilledTo] = useState<string | null>(null);
  const [selectedChartererId, setSelectedChartererId] = useState<number | null>(null);
  const [orgListLoading, setOrgListLoading] = useState(false);
  const [pendingBankId, setPendingBankId] = useState<string | null>(null);

  const serviceOnlyItemsCount = useMemo(
    () => serviceItems.filter((item) => item.type === "service").length,
    [serviceItems]
  );

  const [formErrors, setFormErrors] = useState<{
    invoiceType?: string;
    selectedTerm?: string;
    billedTo?: string;
    serviceItem?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (form.invoiceDate && form.selectedTerm) {
      calculateDueDate(form.selectedTerm);
    }
  }, [form.invoiceDate, form.selectedTerm]);
  
  useEffect(() => {
    setForm((prev) => ({ ...prev, discountValue: "" }));
  }, [form.discountType]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, taxValue: "" }));
  }, [form.taxType]);

  const subTotal = useMemo(
    () =>
      serviceItems.reduce(
        (acc, item) =>
          item.type === "service" ? acc + (item.amount || 0) : acc,
        0
      ),
    [serviceItems]
  );

  const discountAmount = useMemo(() => {
    const value = parseFloat(form.discountValue) || 0;
    return form.discountType === "%" ? (subTotal * value) / 100 : value;
  }, [form.discountValue, form.discountType, subTotal]);

  const amountAfterDiscount = useMemo(
    () => subTotal - discountAmount,
    [subTotal, discountAmount]
  );

  const taxAmount = useMemo(() => {
    const value = parseFloat(form.taxValue) || 0;
    return form.taxType === "%" ? (amountAfterDiscount * value) / 100 : value;
  }, [form.taxValue, form.taxType, amountAfterDiscount]);

  const parsedadjustment = useMemo(() => {
    const val = String(form.adjustment || "");
    if (val.startsWith("+")) return parseFloat(val.substring(1)) || 0;
    if (val.startsWith("-")) return -(parseFloat(val.substring(1)) || 0);
    return parseFloat(val) || 0;
  }, [form.adjustment]);

  const totalAmount = useMemo(
    () => amountAfterDiscount + taxAmount + parsedadjustment,
    [amountAfterDiscount, taxAmount, parsedadjustment]
  );

  // Helper functions
  const generateUniqueId = () => Date.now().toString();

  const formatETA = (eta: any) => {
    if (!eta) return "N/A";
    try {
      return dayjs(eta.$d).format("YYYY-MM-DD HH:mm");
    } catch (error) {
      return "N/A";
    }
  };

  const [lastSectionLineItemType, setLastSectionLineItemType] =
    useState<string>("INVLI001");

  // Handlers
  const handleItemChange = (
    id: string,
    field: keyof ServiceItem,
    value: any
  ) => {
    setServiceItems((prevItems) => {
      const newItems = prevItems.map((item) => {
        if (item.id !== id) return item;

        // Create the updated item
        const updatedItem = { ...item, [field]: value };

        // All your existing logic for calculations here...
        if (field === "cost") {
          const newCost = Math.max(0, parseFloat(value) || 0);
          const discount = item.discount || 0;
          const tax = item.tax || 0;
          const quantity = item.quantity || 1;
          const discounted = newCost - newCost * (discount / 100);
          const taxed = discounted * (1 + tax / 100);
          const amount = parseFloat((taxed * quantity).toFixed(2));
          updatedItem.cost = newCost;
          updatedItem.originalCost = newCost;
          updatedItem.amount = amount;
        }
        if (field === "quantity") {
          const newQuantity = parseFloat(value) || 1;
          const base = item.originalCost ?? item.cost ?? 0;
          const discount = item.discount || 0;
          const tax = item.tax || 0;
          const discounted = base - base * (discount / 100);
          const taxed = discounted * (1 + tax / 100);
          const amount = parseFloat((taxed * newQuantity).toFixed(2));
          updatedItem.quantity = newQuantity;
          updatedItem.amount = amount;
        }
        if (field === "discount" || field === "tax") {
          let v = Math.max(0, parseFloat(value as string) || 0);
          if (v > 100) v = 100;
          value = v;
          const base = item.originalCost ?? item.cost ?? 0;
          const discount = field === "discount" ? value : item.discount || 0;
          const tax = field === "tax" ? value : item.tax || 0;
          const quantity = item.quantity || 1;
          const discounted = base - base * (discount / 100);
          const taxed = discounted * (1 + tax / 100);
          const amount = parseFloat((taxed * quantity).toFixed(2));
          updatedItem[field] = value;
          updatedItem.amount = amount;
        }

        return updatedItem;
      });

      // If we're changing a description, validate immediately
      if (field === "description") {
        setTimeout(() => validateServiceItems(), 0);
      }

      return newItems;
    });
  };

  const handleAddItem = (
    type: "service" | "category",
    insertBeforeId?: string,
    lineItemTypeValue?: string
  ) => {
    if (type === "category") {
      const newSectionLineItemType = "INVLI001";
      setLastSectionLineItemType(newSectionLineItemType);
      const sectionLabel =
        INVOICE_LINE_ITEMS.find((li) => li.value === newSectionLineItemType)
          ?.label || "Port cost Services";
      const newItem: ServiceItem = {
        id: generateUniqueId(),
        description: sectionLabel,
        type: "category",
        lineItemType: newSectionLineItemType,
        discountAmount: 0,
        invoiceLineItemId: null,
        taxAmount: 0,
        invoiceHeaderId: null,
      };
      setServiceItems((prevItems) => {
        let newItems;
        if (insertBeforeId) {
          const index = prevItems.findIndex(
            (item) => item.id === insertBeforeId
          );
          if (index > -1) {
            newItems = [...prevItems];
            newItems.splice(index, 0, newItem);
          }
        } else {
          newItems = [...prevItems, newItem];
        }
        // After adding the section, update all following service rows to match the section's lineItemType
        if (newItems) {
          let foundSection = false;
          let currentLineItemType = null;
          for (let i = 0; i < newItems.length; i++) {
            if (newItems[i].type === "category") {
              foundSection = true;
              currentLineItemType = newItems[i].lineItemType;
            } else if (foundSection && newItems[i].type === "service") {
              newItems[i] = {
                ...newItems[i],
                lineItemType: currentLineItemType,
              };
            }
          }
          return newItems;
        }
        return prevItems;
      });
      return;
    }
    let newLineItemType = "INVLI001";
    if (insertBeforeId) {
      const index = serviceItems.findIndex(
        (item) => item.id === insertBeforeId
      );
      if (index > 0) {
        for (let i = index - 1; i >= 0; i--) {
          if (serviceItems[i].type === "category") {
            newLineItemType = serviceItems[i].lineItemType || "INVLI001";
            break;
          }
        }
      }
    } else if (serviceItems.length > 0) {
      for (let i = serviceItems.length - 1; i >= 0; i--) {
        if (serviceItems[i].type === "category") {
          newLineItemType = serviceItems[i].lineItemType || "INVLI001";
          break;
        }
      }
    }
    const newItem: ServiceItem = {
      id: generateUniqueId(),
      description: "",
      quantity: 1,
      rate: 0.0,
      amount: 0.0,
      type: "service",
      lineItemType: newLineItemType,
      discountAmount: 0,
      invoiceLineItemId: null,
      taxAmount: 0,
      invoiceHeaderId: null,
    };
    setServiceItems((prevItems) => {
      if (insertBeforeId) {
        const index = prevItems.findIndex((item) => item.id === insertBeforeId);
        if (index > -1) {
          const newItems = [...prevItems];
          newItems.splice(index, 0, newItem);
          return newItems;
        }
      }
      return [...prevItems, newItem];
    });
  };

  const handleDeleteItem = (id: string) => {
    setServiceItems((prevItems) => {
      const itemToDelete = prevItems.find((item) => item.id === id);
      const newItems = prevItems.filter((item) => item.id !== id);

      if (itemToDelete?.type === "category") {
        setRowsWithSections((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }

      return newItems;
    });
  };

  const handleCloneItem = (id: string) => {
    setServiceItems((prevItems) => {
      const itemToClone = prevItems.find((item) => item.id === id);
      if (itemToClone) {
        const clonedItem = { ...itemToClone, id: generateUniqueId() };
        const index = prevItems.findIndex((item) => item.id === id);
        if (index > -1) {
          const newItems = [...prevItems];
          newItems.splice(index + 1, 0, clonedItem);
          return newItems;
        }
      }
      return prevItems;
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024); // 5MB limit

    if (validFiles.length !== files.length) {
    }
    if (uploadedFiles.length + validFiles.length > 5) {
      return;
    }

    setUploadedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmountReceived = useMemo(() => {
    return paymentDetails.reduce(
      (sum, detail) => sum + (detail.amount || 0),
      0
    );
  }, [paymentDetails]);

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const previewData = {
    port: globalInputs?.port?.label || "",
    country: globalInputs?.country?.label || "",
    vesselIMO: globalInputs?.vesselIMO?.label || "",
    ETA: globalInputs?.ETA,
    otherSpecifiedInvoiceType: form.otherSpecifiedInvoiceType || "",
    activities:
      globalInputs?.cargoDetails?.map((item: any) => item.activity?.label) ||
      [],
    paymentType:
      PAYMENT_TYPES?.find((type) => type.value === form.invoiceType)?.label ||
      "",
    invoiceNumber: form.invoiceNumber,
    selectedBank: form.selectedBank,
    invoiceDate,
    selectedTerm:
      INVOICE_TERMS?.find((term) => term.code === form.selectedTerm)?.label ||
      "",
    dueDate: form.dueDate,
    serviceItems: serviceItems.map((item) => ({
      ...item,
 
    })),
    netAmount: pdaValue,

    agentReqAmount,
    agentReqPercentage,
    subTotal,
    discountValue: form.discountValue,
    discountType: form.discountType,
    discountAmount,
    taxValue: form.taxValue,
    taxType: form.taxType,
    taxAmount,
    currencyCode: form.currencyCode,
    adjustment: parseFloat(form.adjustment) || 0,
    totalAmount,
    customerNotes: form.customerNotes,
    selectedTerms: form.selectedTerm,
    isPaymentReceived,
    paymentDetails,
    totalAmountReceived,
  };

  const handleViewTerms = () => {
    if (!form.selectedTerm?.length) return;

    const termsData = form.selectedTerm?.map((term) => ({
      ...term,
      orgAdditionalTermsDto: term.orgAdditionalTermsDto || [],
    }));

    setOpenTandC({
      isOpen: true,
      termsData,
    });
  };

  const fetchInvoiceNumber = async () => {
    if (!id || form.invoiceNumberType !== "auto" || !form.invoiceType) return;
    try {
      const selectedType = PAYMENT_TYPES?.find(
        (type) => type.value === form.invoiceType
      );
      const response = await APIGetInvoiceNumber(
        id,
        selectedType?.value || form.invoiceType
      );

      if (response?.data && typeof response.data === "string") {
        setForm((prev) => ({ ...prev, invoiceNumber: response.data }));
      }
    } catch (error) {
      console.error("Error fetching invoice number:", error);
    }
  };

  useEffect(() => {
    if (
      (!invoiceId &&
        form.invoiceNumberType === "auto" &&
        id &&
        form.invoiceType) ||
      isCloning === true
    ) {
      fetchInvoiceNumber();
    }
  }, [form.invoiceType, id, form.invoiceNumberType, invoiceId, isCloning]);

  useEffect(() => {
    const fetchBankOptions = async () => {
      if (!users?.organisationId) return;

      try {
        const response: AxiosResponse<OrganisationData> =
          await getOrganisationByOrgId(Number(users.organisationId));
        const bankOptions =
          response?.data?.bankingDetailsDtoList?.map((bank: any) => ({
            label: `${bank.isPreferred ? "★ " : ""}${bank.accountName} - ${
              bank.accountNumber
            } - ${bank.bankName}`,
            value: String(bank.bankDetailsId || ""),
            isPreferred: bank.isPreferred,
          })) || [];
        setBankOptions(bankOptions);
        // Auto-select preferred bank if invoiceId is not present
        if (!invoiceId) {
          const preferredBank = bankOptions.find((b) => b.isPreferred);
          if (preferredBank) {
            setForm((prev) => ({ ...prev, selectedBank: preferredBank }));
          }
        }
      } catch (error) {
        console.error("Error fetching bank options:", error);
      }
    };

    const fetchTermsOptions = async () => {
      if (!users?.organisationId || !portCode) return;

      try {
        const response: AxiosResponse<TermsAndCondition[]> =
          await getTermsByPort(Number(users.organisationId), portCode);
        const termsOptions =
          response?.data?.map((term: any) => ({
            label: `${term.isPreferred ? "★ " : ""}${term.name || ""}`,
            value: String(term.orgTermsAndConditionId),
            original: term,
          })) || [];
        setTermsOptions(termsOptions);
      } catch (error) {
        console.error("Error fetching terms options:", error);
      }
    };

    fetchBankOptions();
    fetchTermsOptions();
  }, [users?.organisationId, portCode]);

  const calculateDueDate = (termCode: string) => {
    const term = INVOICE_TERMS.find((t) => t.code === termCode)?.label;
    const baseDate = form.invoiceDate || dayjs();
    let newDueDate: dayjs.Dayjs;
    switch (term) {
      case "Net 15":
        newDueDate = baseDate.add(15, "day");
        break;
      case "Net 30":
        newDueDate = baseDate.add(30, "day");
        break;
      case "Net 45":
        newDueDate = baseDate.add(45, "day");
        break;
      case "Net 60":
        newDueDate = baseDate.add(60, "day");
        break;
      case "Due on Receipt":
        newDueDate = baseDate;
        break;
      case "Due End of Month":
        newDueDate = baseDate.endOf("month");
        break;
      case "Due End of Next Month":
        newDueDate = baseDate.add(1, "month").endOf("month");
        break;
      default:
        newDueDate = baseDate;
    }
    setForm((prev) => ({ ...prev, dueDate: newDueDate }));
  };

  const fetchAncillaryCharges = async () => {
    if (!users?.organisationId) return;

    const response = await APIGetAllAnciallyCharges(
      Number(users.organisationId)
    );
    if (response?.data) {
      setAncillaryCharges(Array.isArray(response.data) ? response.data : []);
    } else {
      throw new Error("No data received from ancillary charges API");
    }
  };

  const handleAddNewAncillaryCharge = () => {
    setShowAncillaryChargesDialog(true);
  };

  const handleAncillaryChargesClose = async () => {
    fetchAncillaryCharges();
    setShowAncillaryChargesDialog(false);
  };
  
  useEffect(() => {
    fetchAncillaryCharges();
  }, [id, users.organisationId]);

  const fetchInvoiceData = async () => {
    try {
      setIsLoadings(true);
      const response = await APIGetInvoiceByTransaction(
        TransactionId || agentTransactionId
      );
      const data = response.data as any;
      setInvoiceData(data);
      setForm((prev) => ({
        ...prev,
        currencyCode: data?.userTransactionsDto?.currencyCode || "",
      }));
      if (Array.isArray(data.invoiceAttachmentDto)) {
        setExistingAttachments(data.invoiceAttachmentDto);
      }
      setForm(prev => ({
        ...prev,
        attachments: data.invoiceAttachmentDto || []
      }));
    } catch (error) {
      console.error("Error fetching invoice data:", error);
    } finally {
      setIsLoadings(false);
    }
  };

  const handleImportFromPDA = async () => {
    setImportSource(true);
    try {
      if (!invoiceData) {
        await fetchInvoiceData();
      }
      if (invoiceData?.userTxCostItemDto && invoiceData.userTxCostItemDto.length > 0) {
        const items = invoiceData.userTxCostItemDto.map(
          (item: any): ServiceItem => ({
            id: item.userTxCostItemId,
            description: item.costItemName,
            quantity: 1,
            cost: item.totalCostItemCost,
          originalCost: item.totalCostItemCost,
            amount: item.totalCostItemCost,
            type: "service",
            tax: item.taxRate,
            costItemCode: item.costItemCode,
            currency: item.currency,
            statusCode: item.statusCode,
            statusDescription: item.statusDescription,
            isCustom: item.isCustom,
            version: item.version,
            lineItemType: "INVLI001",
            invoiceLineItemId: null,
            taxAmount: 0,
            discountAmount: 0,
            invoiceHeaderId: null,
          })
        );
        setServiceItems(items);
      } else {
        const blankItem: ServiceItem = {
          id: uuidv4(),
          description: "",
          quantity: 1,
          cost: 0.0,
          amount: 0.0,
          type: "service",
          lineItemType: "INVLI001",
          discountAmount: 0,
          invoiceLineItemId: null,
          taxAmount: 0,
          invoiceHeaderId: null,
        };
        setServiceItems([blankItem]);
      }
    } catch (error) {
      console.error("Error importing PDA data:", error);
    }
  };

  // Add useEffect to fetch invoice data immediately
  useEffect(() => {
    fetchInvoiceData();
  }, [TransactionId]);

  useEffect(() => {
    if (
      !invoiceId &&
      serviceItems.length > 0 &&
      !serviceItems.some((item) => item.type === "category")
    ) {
      setServiceItems((prev) => [
        {
          id: generateUniqueId(),
          description: "Port cost Services",
          type: "category",
          lineItemType: "INVLI001",
          discountAmount: 0,
          invoiceLineItemId: null,
          taxAmount: 0,
          invoiceHeaderId: null,
        },
        ...prev,
      ]);
    }
  }, [serviceItems, invoiceId]);

  useEffect(() => {
    if (pendingBankId && bankOptions.length > 0) {
      const matchedBank = bankOptions.find(
        (opt) => opt.value === pendingBankId
      );
      if (matchedBank) {
        setForm((prev) => ({
          ...prev,
          selectedBank: matchedBank,
        }));
      }
    }
  }, [pendingBankId, bankOptions]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const buildInvoicePayload = async () => {
    // Add existing attachments from API (if any)
    const allAttachments = [
      // For existing attachments, force invoiceAttachmentId to null
      ...(existingAttachments || []).map(att => ({
        ...att,
        invoiceAttachmentId: null,
        // If attachmentDto exists, also clear its attachmentId if present
        attachmentDto: att.attachmentDto
          ? { ...att.attachmentDto, attachmentId: null }
          : undefined,
      })),
      // For new uploads, set invoiceAttachmentId to null
      ...(await Promise.all(
        uploadedFiles.map(async (file) => ({
          description: file.name,
          invoiceId: invoiceId,
          invoiceAttachmentId: null,
          attachmentDto: {
            fileName: file.name,
            fileSize: file.size,
            fileContent: await fileToBase64(file),
            attachmentType: file.type,
            attachmentId: null,
          },
        }))
      )),
    ];

    const invoiceTermsAndConditionDto = form.selectedTerms.map(
      (term: any) => ({
        invoiceTermsAndConditionId: null,
        // Only include invoiceId if not cloning
        ...(!isCloning && { invoiceId: invoiceId || null }),
        orgTermsAndConditionId:
          term.original?.orgTermsAndConditionId || term.value,
        status: term.original?.status ?? true,
        orgTermsAndConditionsDto: term.original || null,
      })
    );

    const selectedType = PAYMENT_TYPES.find(
      (type) => type.value === form.invoiceType
    );
    const invoiceDto: any = {
      transactionId:  operatorTransactionId ? operatorTransactionId : id,
      agentTransactionId: TransactionId,
      invoiceType: selectedType?.code || form.invoiceType,
      otherSpecifiedInvoiceType: form.otherSpecifiedInvoiceType || "",
      invoiceNumber: form.invoiceNumber,
      invoiceStatus: INVOICE_STATUS.DRAFT,
      parentInvoiceId: form.parentInvoiceId,
      invoiceDate: invoiceDate?.toISOString(),
      invoiceTerm: form.selectedTerm,
      adjustment: form.adjustment || "",
      dueDate: form.dueDate?.toISOString(),
      customerNotes: form.customerNotes,
      orgBankingDetailsId: form.selectedBank?.value,
      subtotal: subTotal,
      createdBy: userName,
      updatedBy: userName,
      isRecurring,
      discountPercentage:
        form.discountType === "%" ? Number(form.discountValue) : undefined,
      taxPercentage: form.taxType === "%" ? Number(form.taxValue) : undefined,
      taxAmount,
      discountAmount,
      billedByOrgId: users.organisationId,
      billedToOrgId: orgType === "OT003" ? selectedChartererId : billedTo || "",
      isChartererOrg: orgType === "OT003",
      chartererDetailsId: orgType === "OT003" ? selectedChartererId: "",
      totalAmount,
      sentAt: new Date().toISOString(),
      sentBy: userName,
      amountPaid: totalAmountReceived,
      balanceDue: totalAmount - totalAmountReceived,
      currency: form.currencyCode,
      isServiceSummaryShown: form.showServicesSummary,
      orgTypeCode: orgType,
    };
    // Only include invoiceId if not cloning
    if (!isCloning && invoiceId) {
      invoiceDto.invoiceId = invoiceId;
    }
    const invoiceHeaderDto: any[] = [];
    let currentHeader: any = null;
    let headerIdx = 0;
    // Filter out serviceItems with no description or only whitespace
    const filteredServiceItems = serviceItems.filter(
      (item) =>
        item.type !== "service" ||
        (typeof item.description === "string" && item.description.trim() !== "")
    );
    for (let i = 0; i < filteredServiceItems.length; i++) {
      const item = filteredServiceItems[i];
      if (item.type === "category") {
        // If editing and APIGetInvoiceById data is available, try to find the matching header
        let headerFromApi = null;
        if (invoiceId && invoiceData?.invoiceHeaderDto) {
          // Try to match by header id if available, else by name and order
          headerFromApi = invoiceData.invoiceHeaderDto.find((h, idx) => {
            if (
              h.invoiceHeaderId &&
              item.invoiceHeaderId &&
              h.invoiceHeaderId.toString() === item.invoiceHeaderId.toString()
            )
              return true;
            return h.headerName === item.description && idx === headerIdx;
          });
        }
        const header = INVOICE_LINE_ITEMS.find(
          (li) => li.value === item.lineItemType
        );
        const headerName = header ? header.label : item.lineItemType;

        currentHeader = {
          headerName: headerName,
          ...(!isCloning && {
            invoiceHeaderId:
              headerFromApi?.invoiceHeaderId || item.invoiceHeaderId || null,
            invoiceId: headerFromApi?.invoiceId || invoiceId || null,
            status: headerFromApi?.status || "RST001",
          }),
          ...(isCloning && { status: "RST001" }),
          invoiceLineItemDto: [],
        };
        invoiceHeaderDto.push(currentHeader);
        headerIdx++;
      } else if (item.type === "service" && currentHeader) {
        const lineItem: any = {
          ...(!isCloning && {
            invoiceLineItemId: item.invoiceLineItemId ?? null,
          }),
          serviceName: item.description ?? null,
          description: item.description ?? null,
          quantity: item.quantity ?? 0,
          unitPrice: item.cost ?? 0,
          discountPercentage: item.discount ?? 0,
          taxPercentage: item.tax ?? 0,
          discountAmount: item.discountAmount ?? 0,
          taxAmount: item.taxAmount ?? 0,
          amount: item.amount ?? 0,
          lineItemType: item.lineItemType,
        };
        currentHeader.invoiceLineItemDto.push(lineItem);
      }
    }
    let recurringInvoiceDto = null;
    if (isRecurring || form.recurringInvoiceDto) {
      recurringInvoiceDto = {
        ...(form.recurringInvoiceDto || {}),
        startOn: form.recurringInvoiceDto?.startOn ? form.recurringInvoiceDto.startOn.format('YYYY-MM-DD') : null,
        endOn: form.recurringInvoiceDto?.neverExpires ? null : (form.recurringInvoiceDto?.endOn ? form.recurringInvoiceDto.endOn.format('YYYY-MM-DD') : null),
        repeatUnit: form.recurringInvoiceDto?.repeatUnit,
        repeatInterval: form.recurringInvoiceDto?.repeatInterval,
        neverExpires: form.recurringInvoiceDto?.neverExpires,
      };
    }
    return {
      invoiceDto,
      invoiceAttachmentDto: allAttachments,
      invoiceHeaderDto,
      invoiceTermsAndConditionDto,
      ...(recurringInvoiceDto ? { recurringInvoiceDto } : {}),
    };
  };

  const handleSharePdf = async (invoiceId: any, invoiceNumber: any) => {
    try {
      const response = await GeneratePDFLink(invoiceId, invoiceNumber);
      if (response?.status === 200 && response.data) {
        const pdfUrl = response.data;
        const subject = encodeURIComponent(
          `Invoice Document – Invoice Number: ${invoiceNumber}`
        );
        const body = encodeURIComponent(
          `Dear User,\n\nPlease find the invoice document for Invoice Number: ${invoiceNumber}.\n\nYou can view the document using the link below:\n ${pdfUrl}\n\nBest regards,\n Team Portcosts`
        );
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        onClose();
      } else {
        dispatch(
          notificationToaster({
            duration: 4000,
            message: "Failed to generate invoice share link.",
            severity: "error",
          })
        );
      }
    } catch (error) {
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "An error occurred while generating the invoice share link.",
          severity: "error",
        })
      );
    }
  };
  
  // Validation function
  const validateForm = () => {
    const errors: {
      invoiceType?: string;
      selectedTerm?: string;
      billedTo?: string;
      serviceItem?: string;
    } = {};
    if (!form.invoiceType) {
      errors.invoiceType = "Invoice Type is required";
    }
    if (!form.selectedTerm) {
      errors.selectedTerm = "Invoice Terms is required";
    }
    if (!billedTo) {
      errors.billedTo = "Organization is required";
    }

    const hasValidService =
      Array.isArray(serviceItems) &&
      serviceItems.some(
        (item) => item.type === "service" && !!item.description && item.description.trim() !== ""
      );

    if (!hasValidService) {
      errors.serviceItem = "Please enter at least one item in the Items Table to proceed.";
      dispatch(
        notificationToaster({
          duration: 5000,
          message: "Please enter at least one item in the Items Table to proceed.",
          severity: "error",
        })
      );
    }

    // Check for negative numbers in serviceItems
    const hasNegativeAmount = serviceItems.some(
      (item) =>
        item.type === "service" &&
        ((typeof item.amount === 'number' && item.amount < 0) ||
         (typeof item.cost === 'number' && item.cost < 0) ||
         (typeof item.discount === 'number' && item.discount < 0) ||
         (typeof item.tax === 'number' && item.tax < 0))
    );

    if (hasNegativeAmount) {
      errors.serviceItem = "Amount, Discount, and Tax cannot be negative.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAsDraft = async () => {
    if (!validateForm()) return;
    try {
      const payload = await buildInvoicePayload();
      if (isCloning) {
        if (Array.isArray(payload.invoiceAttachmentDto)) {
          payload.invoiceAttachmentDto = payload.invoiceAttachmentDto.map(att => ({
            ...att,
            invoiceAttachmentId: null,
            attachmentDto: {
              ...att.attachmentDto,
              attachmentId: null,
            },
          }));
        }
        if (Array.isArray(payload.invoiceTermsAndConditionDto)) {
          payload.invoiceTermsAndConditionDto = payload.invoiceTermsAndConditionDto.map(tc => ({
            ...tc,
            invoiceTermsAndConditionId: null,
          }));
        }
      }
      payload.invoiceDto.invoiceStatus = INVOICE_STATUS.DRAFT;
      if (invoiceId && !isCloning) {
        await ApiUpdateInvoice(payload);
      } else {
        await ApiCreateInvoice(payload);
      }
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Invoice saved as draft successfully.",
          severity: "success",
        })
      );
      onClose();
    } catch (error) {
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Failed to save invoice as draft.",
          severity: "error",
        })
      );
    }
  };
  
  const handleSaveRecurring = async () => {
    if (!validateForm()) return;
    try {
      const payload = await buildInvoicePayload();
      payload.invoiceDto.invoiceStatus = INVOICE_STATUS.DRAFT;
      if (invoiceId && !isCloning) {
        await ApiUpdateInvoice(payload);
      } else {
        await ApiCreateInvoice(payload);
      }
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Invoice saved successfully.",
          severity: "success",
        })
      );
      onClose();
    } catch (error) {
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Failed to save invoice as draft.",
          severity: "error",
        })
      );
    }
  };
  
  const [saveAndSendLoading, setSaveAndSendLoading] = useState(false);

  const handleSaveAndSend = async () => {
    if (!validateForm()) return;
    setSaveAndSendLoading(true);
    try {
      const payload = await buildInvoicePayload();
      payload.invoiceDto.invoiceStatus = INVOICE_STATUS.SENT;
      if (invoiceId && !isCloning) {
        await ApiUpdateInvoice(payload);
        dispatch(
          notificationToaster({
            duration: 4000,
            message: "Invoice Saved Successfully.",
            severity: "success",
          })
        );
        // Use existing invoiceId and form.invoiceNumber for sharing
        await handleSharePdf(invoiceId, form.invoiceNumber);
      } else {
        const res = await ApiCreateInvoice(payload);
        dispatch(
          notificationToaster({
            duration: 4000,
            message: "Invoice Saved Successfully.",
            severity: "success",
          })
        );
        // Use response data for sharing
        if (res?.data?.invoiceId && res?.data?.invoiceNumber) {
          await handleSharePdf(res.data.invoiceId, res.data.invoiceNumber);
        }
      }
    } catch (error) {
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Failed to save and send invoice.",
          severity: "error",
        })
      );
    } finally {
      setSaveAndSendLoading(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    if (!validateForm()) return;
    try {
      const payload = await buildInvoicePayload();
      payload.invoiceDto.invoiceStatus = INVOICE_STATUS.PRE_APPROVAL;
      if (invoiceId && (invoiceStatus === INVOICE_STATUS.APPROVED || invoiceStatus === INVOICE_STATUS.APPROVED_REVISED )) {
        payload.invoiceDto.invoiceStatus = INVOICE_STATUS.PRE_APPROVAL_REVISED;
      }
      if (invoiceId && !isCloning) {
        await ApiUpdateInvoice(payload);
      } else {
        await ApiCreateInvoice(payload);
      }
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Invoice Saved and Submitted Successfully!",
          severity: "success",
        })
      );
      onClose();
    } catch (error) {
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Failed to save invoice.",
          severity: "error",
        })
      );
    }
  };
  
  const handleUpdateAndApprove = async () => {
    if (!validateForm()) return;
    try {
      const payload = await buildInvoicePayload();
      payload.invoiceDto.invoiceStatus =
        invoiceStatus === INVOICE_STATUS.PRE_APPROVAL_REVISED || invoiceStatus === "INVST010"
          ? INVOICE_STATUS.APPROVED_REVISED
          : INVOICE_STATUS.APPROVED;
      
      if (invoiceId && !isCloning) {
        await ApiUpdateInvoice(payload);
      } else {
        await ApiCreateInvoice(payload);
      }
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Invoice Updated and Approved Successfully!",
          severity: "success",
        })
      );
      onClose();
    } catch (error) {
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Failed to save invoice.",
          severity: "error",
        })
      );
    }
  };
  
  const handleUpdate = async () => {
    if (!validateForm()) return;
    try {
      const payload = await buildInvoicePayload();
      payload.invoiceDto.invoiceStatus = INVOICE_STATUS.PRE_APPROVAL;

      if (invoiceId && !isCloning) {
        await ApiUpdateInvoice(payload);
      } else {
        await ApiCreateInvoice(payload);
      }
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Invoice Updated  Successfully!",
          severity: "success",
        })
      );
      onClose();
    } catch (error) {
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Failed to save invoice.",
          severity: "error",
        })
      );
    }
  };
  
  // Prefill for edit mode
  useEffect(() => {
    if (!invoiceId) return;
    const fetchInvoiceById = async () => {
      try {
        setIsLoading(true);
        const response = await APIGetInvoiceById<any>(invoiceId);
        const data = response?.data;
        if (data && data.invoiceDto) {
          const apiInvoiceTypeCode = data.invoiceDto.invoiceType || "";
          const paymentTypeObj = PAYMENT_TYPES.find(
            (type) => type.code === apiInvoiceTypeCode
          );

          setForm({
            invoiceType: paymentTypeObj ? paymentTypeObj.value : "",
            invoiceNumberType: "auto",
            invoiceNumber: data.invoiceDto.invoiceNumber || "",
            displayInvoiceNumber: data.invoiceDto.displayInvoiceNumber || "",
            bankAccount: data.invoiceDto.orgBankingDetailsId || "",
            selectedBank: null,
            parentInvoiceId: data.invoiceDto.parentInvoiceId || "",
            billedByOrgId:
              data.invoiceDto.billedByOrgId ||
              data.invoiceDto.billedToOrgId ||
              "",
            invoiceDate: data.invoiceDto.invoiceDate
              ? dayjs(data.invoiceDto.invoiceDate)
              : null,
            dueDate: data.invoiceDto.dueDate
              ? dayjs(data.invoiceDto.dueDate)
              : null,
            selectedTerm: data.invoiceDto.invoiceTerm || "",
            selectedTerms: Array.isArray(data.invoiceTermsAndConditionDto)
              ? data.invoiceTermsAndConditionDto.map((tc: any) => ({
                  label:
                    tc.orgTermsAndConditionsDto?.name ||
                    tc.orgTermsAndConditionId?.toString() ||
                    "",
                  value: tc.orgTermsAndConditionId?.toString() || "",
                  original: tc.orgTermsAndConditionsDto || {},
                  invoiceTermsAndConditionId: tc.invoiceTermsAndConditionId,
                }))
              : [],
            customerNotes: data.invoiceDto.customerNotes || "",
            discountValue: data.invoiceDto.discountPercentage?.toString() || "",
            discountType: "%",
            taxValue: data.invoiceDto.taxPercentage?.toString() || "",
            taxType: "%",
            isRecurring: data.isRecurring || false,
            adjustment: data.invoiceDto.adjustment || "",
            currencyCode: data.invoiceDto.currency || "",
            showServicesSummary: !!data.invoiceDto.isServiceSummaryShown,
            otherSpecifiedInvoiceType:
              data.invoiceDto.otherSpecifiedInvoiceType || "",
            recurringInvoiceDto: null,
            startOn: dayjs(),
            endOn: null,
            repeatUnit: null,
            repeatInterval: 'Months',
            neverExpires: false,
            attachments: []
          });
          setAgentReqAmount(data?.advancePaymentDto?.agentReqAmount);
          setPdaValue(data?.advancePaymentDto?.netAmount);
          setAdvancedPayment(data?.advancePaymentDto)
          setAgentReqPercentage(data?.advancePaymentDto?.agentReqPercentage);
          setPendingBankId(
            data.invoiceDto.orgBankingDetailsId?.toString() || null
          );
          // Service items
          if (Array.isArray(data.invoiceHeaderDto)) {
            const items = data.invoiceHeaderDto.flatMap((header) => {
              const sectionId = header.invoiceHeaderId
                ? header.invoiceHeaderId.toString()
                : Math.random().toString();
              const section = {
                id: sectionId,
                description: header.headerName,
                type: "category",
                lineItemType:
                  header.invoiceLineItemDto?.[0]?.lineItemType || "INVLI001",
                invoiceLineItemId: null,
                invoiceHeaderId: null,
                invoiceId: header.invoiceId,
                status: header.status,
                discountAmount: 0,
                taxAmount: 0,
              };
              const services = (header.invoiceLineItemDto || []).map(
                (line) => ({
                  id:
                    line.invoiceLineItemId?.toString() ||
                    Math.random().toString(),
                  description: line.description,
                  quantity: line.quantity,
                  rate: line.unitPrice,
                  amount: line.amount ?? line.unitPrice,
                  type: "service",
                  discount: line.discountPercentage,
                  tax: line.taxPercentage,
                  cost: line.unitPrice,
                  lineItemType: line.lineItemType,
                  discountAmount: line.discountAmount ?? 0,
                  invoiceLineItemId: null,
                  invoiceHeaderId: null,
                  taxAmount: line.taxAmount ?? 0,
                })
              );
              return [section, ...services];
            });
            setServiceItems(items);
          }
          // Prefill recurring fields if present
          if (data.recurringInvoiceDto) {
            setForm((prev) => ({
              ...prev,
              recurringInvoiceDto: {
                ...data.recurringInvoiceDto,
                startOn: data.recurringInvoiceDto.startOn ? dayjs(data.recurringInvoiceDto.startOn) : dayjs(),
                endOn: data.recurringInvoiceDto.endOn ? dayjs(data.recurringInvoiceDto.endOn) : null,
              }
            }));
          }
          if (Array.isArray(data.invoiceAttachmentDto)) {
            setExistingAttachments(data.invoiceAttachmentDto);
          }
          setInvoiceStatus(data.invoiceDto.invoiceStatus || "");

          if (data.invoiceDto.orgTypeCode) {
            setOrgType(data.invoiceDto.orgTypeCode);
            setOrgListLoading(true);
            apiGetOrgListByOrgType<any>(data.invoiceDto.orgTypeCode, operatorTransactionId || id)
              ?.then((res) => {
                if (Array.isArray(res?.data)) setOrgList(res.data);
                if (data.invoiceDto.billedToOrgId) {
                  setBilledTo(data.invoiceDto.billedToOrgId);
                }
              })
              .finally(() => setOrgListLoading(false));
          }
          setForm(prev => ({
            ...prev,
            attachments: data.invoiceAttachmentDto || []
          }));
        }
      } catch (error) {
        // handle error
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoiceById();
  }, [invoiceId]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSectionLineItemTypeChange = (
    sectionId: string,
    newLineItemType: string
  ) => {
    setServiceItems((prevItems) => {
      const newItems = [...prevItems];
      const sectionIdx = newItems.findIndex((item) => item.id === sectionId);
      if (sectionIdx === -1) return newItems;
      // Update the section itself
      newItems[sectionIdx] = {
        ...newItems[sectionIdx],
        lineItemType: newLineItemType,
      };
      // Update all service rows after this section until next section or end
      for (let i = sectionIdx + 1; i < newItems.length; i++) {
        if (newItems[i].type === "category") break;
        if (newItems[i].type === "service") {
          newItems[i] = {
            ...newItems[i],
            lineItemType: newLineItemType,
          };
        }
      }
      return newItems;
    });
  };

  const handleClearServices = () => {
    // Clear all services and add default header with blank row
    const defaultSection = {
      id: generateUniqueId(),
      description: "Port cost Services",
      type: "category" as const,
      lineItemType: "INVLI001",
      discountAmount: 0,
      invoiceLineItemId: null,
      taxAmount: 0,
      invoiceHeaderId: null,
    };

    const blankRow = {
      id: generateUniqueId(),
      description: "",
      quantity: 1,
      rate: 0.0,
      amount: 0.0,
      type: "service" as const,
      lineItemType: "INVLI001",
      discountAmount: 0,
      invoiceLineItemId: null,
      taxAmount: 0,
      invoiceHeaderId: null,
    };

    setServiceItems([defaultSection, blankRow]);
    setImportSource(false);
  };

  useEffect(() => {
    if (fromNomination && !invoiceId) {
      const advanceRequestType = PAYMENT_TYPES.find(
        (type) => type.value === "ADA"
      );
      if (advanceRequestType) {
        setForm((prev) => ({ ...prev, invoiceType: advanceRequestType.value }));
      }
    }
  }, [fromNomination, invoiceId]);

  const [operatorAdvance, setOperatorAdvance] = useState<{
    percentage: number;
    amount: number;
  } | null>(null);

  const agentOrgId = invoiceData?.agentOrgId;
  const operatorOrgId = invoiceData?.operatorOrgId;
  const agentName = invoiceData?.agentName;
  const operatorName = invoiceData?.operatorName;
  const userOrgId = users?.organisationId;

  const [billedToOption, setBilledToOption] = useState<"default" | "other">(
    "default"
  );
  const [customBilledToName, setCustomBilledToName] = useState("");

  let billedToOrgId = "";
  let billedToOrgName = "";
  if (agentOrgId && operatorOrgId && userOrgId) {
    if (String(agentOrgId) === String(userOrgId)) {
      billedToOrgId = operatorOrgId;
      billedToOrgName = operatorName;
    } else if (String(operatorOrgId) === String(userOrgId)) {
      billedToOrgId = agentOrgId;
      billedToOrgName = agentName;
    }
  }

  // If 'Other' is selected, override billedToOrgName
  if (billedToOption === "other" && customBilledToName) {
    billedToOrgName = customBilledToName;
    billedToOrgId = "";
  }

  // Ensure at least one blank service row if serviceItems is empty and not editing
  useEffect(() => {
    if (!invoiceId && serviceItems.length === 0) {
      setServiceItems([
        {
          id: generateUniqueId(),
          description: "",
          quantity: 1,
          rate: 0.0,
          amount: 0.0,
          type: "service",
          lineItemType: "INVLI001",
          discountAmount: 0,
          invoiceLineItemId: null,
          taxAmount: 0,
          invoiceHeaderId: null,
        },
      ]);
    }
  }, [serviceItems.length, invoiceId]);

  const handleOrgTypeChange = async (e: any) => {
    const selectedType = e.target.value;
    setOrgType(selectedType);
    setBilledTo(null);
    setOrgList([]);

    if (selectedType === "OT003") {
      setOrgListLoading(true);
      try {
        const res = await apiGetChartererList(id);
        const charterers = (res.data as any[]).map((c: any) => ({ ...c, organisationId: c.chartererDetailsId, organisationName: c.organizationName }));
        setOrgList(charterers || []);
      } catch (err) {
        console.error(err);
        setOrgList([]);
      } finally {
        setOrgListLoading(false);
      }
    } else if (selectedType) {
      setOrgListLoading(true);
      try {
        const res = await apiGetOrgListByOrgType<any>(selectedType, operatorTransactionId || id);
        if (Array.isArray(res?.data)) setOrgList(res.data);
      } catch {
        setOrgList([]);
      } finally {
        setOrgListLoading(false);
      }
    }
  };

  const handleBilledToChange = (orgId: string | null, chartererDetailsId?: number | null) => {
    setBilledTo(orgId);
    if (orgType === "OT003") {
      setSelectedChartererId(chartererDetailsId || null);
    }
  };

  const handleRemoveExistingAttachment = (index: number) => {
    setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateServiceItems = () => {
    const hasServiceWithDescription = serviceItems.some(
      (item) => item.type === "service" && item.description?.trim()
    );

    if (hasServiceWithDescription) {
      // Clear the error if there's at least one valid description
      setFormErrors(prev => ({ ...prev, serviceItem: undefined }));
    }
  };

  const handleInvoiceDateChange = (newValue: dayjs.Dayjs | null) => {
    if (newValue) {
      handleFormChange("invoiceDate", newValue);
      setInvoiceDate(newValue);
      const today = dayjs();
      if (newValue.isBefore(today, "day")) {
        setInvoiceDateWarning("Invoice Date is in the Past");
      } else if (newValue.isAfter(today, "day")) {
        setInvoiceDateWarning("Invoice Date is in the Future");
      } else {
        setInvoiceDateWarning(null);
      }
      if (form.selectedTerm) {
        calculateDueDate(form.selectedTerm);
      }
    }
  };

  const handleImportFromAdvance = async () => {
    try {
      const res = await apiGetAdvancePayment(TransactionId, null);
      const data = res?.data as AdvancePaymentResponse;
      if (data) {
        setAgentReqAmount(data?.agentReqAmount);
        setPdaValue(data?.netAmount)
        setAgentReqPercentage(data?.agentReqPercentage);
        setAdvancedPayment(data);
        if (formErrors.serviceItem) {
          setFormErrors((prev) => ({ ...prev, serviceItem: undefined }));
        }
        const cost = data?.agentReqAmount || 0;
        const quantity = 1;
        const amount = parseFloat((cost * quantity).toFixed(2)); 
        const dialogTitle = `Advance Payment for ${operatorTransactionId || id}`;

        setServiceItems((prev) => {
          const filtered = prev.filter(
            (item) =>
              item.type === "category" ||
              (typeof item.description === "string" && item.description.trim() !== "")
          );
          return [
            ...filtered,
            {
              id: generateUniqueId(),
              description: dialogTitle,
              quantity: 1,
              rate: cost,
              cost: cost,
              amount: amount,
              type: "service",
              lineItemType: "INVLI001",
              invoiceLineItemId: null,
              invoiceHeaderId: null,
              discountAmount: 0,
              taxAmount: 0,
            },
          ];
        });
      }
    } catch (error) {
      console.log(error, "error");
      dispatch(
        notificationToaster({
          duration: 4000,
          message: "Failed to import advance payment.",
          severity: "error",
        })
      );
    }
  };

  return (
    <>
      <CustomizedDialogs
        open={open}
        size="lg"
        viewOnly={true}
        footer={false}
        handleClose={() => onClose()}
        tittle={`${
          PAYMENT_TYPES?.find((type) => type.value === form.invoiceType)
            ?.label || ""
        } for ${operatorTransactionId || id }`}
      >
        {isLoading ? (
          <div>
            <Loading isLoading={isLoading} />{" "}
          </div>
        ) : (
          <Box sx={{ fontFamily: "Inter, sans-serif" }}>
            {/* Invoice Details Component */}
            <InvoiceDetails
              form={form}
              formErrors={formErrors}
              invoiceDate={invoiceDate}
              invoiceMenuAnchorEl={invoiceMenuAnchorEl}
              bankOptions={bankOptions}
              termsOptions={termsOptions}
              invoiceData={invoiceData}
              isLoadings={isLoadings}
              globalInputs={globalInputs}
              orgType={orgType}
              orgList={orgList}
              billedTo={billedTo}
              orgListLoading={orgListLoading}
              invoiceId={invoiceId}
              isCloning={isCloning}
              fromNomination={fromNomination}
              invoiceDateWarning={invoiceDateWarning}
              users={users}
              operatorTransactionId={operatorTransactionId}
              id={id}
              onFormChange={handleFormChange}
              onInvoiceMenuAnchorElChange={setInvoiceMenuAnchorEl}
              onOrgTypeChange={handleOrgTypeChange}
              onBilledToChange={handleBilledToChange}
              onShowAddOrgDialog={() => setShowAddOrgDialog(true)}
              onInvoiceDateChange={handleInvoiceDateChange}
              onViewTerms={handleViewTerms}
              formatETA={formatETA}
            />

            {/* Recurring Invoice Details */}
            {isRecurring && (
              <Box sx={{ py: 2 }}>
                <Box sx={{ fontFamily: "Inter, sans-serif" }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    {/* Add recurring form fields here if needed */}
                  </LocalizationProvider>
                </Box>
              </Box>
            )}

            {/* Invoice Items Table Component */}
            <InvoiceItemsTable
              serviceItems={serviceItems}
              form={form}
              formErrors={formErrors}
              itemMenuAnchorEl={itemMenuAnchorEl}
              selectedItemId={selectedItemId}
              rowsWithSections={rowsWithSections}
              ancillaryCharges={ancillaryCharges}
              importSource={importSource}
              serviceOnlyItemsCount={serviceOnlyItemsCount}
              operatorTransactionId={operatorTransactionId}
              id={id}
              onItemChange={handleItemChange}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
              onCloneItem={handleCloneItem}
              onSectionLineItemTypeChange={handleSectionLineItemTypeChange}
              onItemMenuAnchorElChange={setItemMenuAnchorEl}
              onSelectedItemIdChange={setSelectedItemId}
              onInvoiceMenuAnchorElChange={setInvoiceMenuAnchorEl}
              onAddNewAncillaryCharge={handleAddNewAncillaryCharge}
              onImportFromPDA={handleImportFromPDA}
              onImportFromAdvance={handleImportFromAdvance}
              onClearServices={handleClearServices}
              apiCurrencyConvertor={apiCurrencyConvertor}
              validateServiceItems={validateServiceItems}
              generateUniqueId={generateUniqueId}
            />

            {/* Invoice Calculations Component */}
            <InvoiceCalculations
              form={form}
              subTotal={subTotal}
              discountAmount={discountAmount}
              amountAfterDiscount={amountAfterDiscount}
              taxAmount={taxAmount}
              parsedAdjustment={parsedadjustment}
              totalAmount={totalAmount}
              pdaValue={pdaValue}
              agentReqAmount={agentReqAmount}
              agentReqPercentage={agentReqPercentage}
              advancedPayment={advancedPayment}
              termsOptions={termsOptions}
              uploadedFiles={uploadedFiles}
              existingAttachments={existingAttachments}
              onFormChange={handleFormChange}
              onFileUpload={handleFileUpload}
              onRemoveFile={handleRemoveFile}
              onRemoveExistingAttachment={handleRemoveExistingAttachment}
              onViewTerms={handleViewTerms}
              onAttachmentClick={(attachment) => {
                setSelectedAttachment(attachment);
                setAttachmentDialogOpen(true);
              }}
            />

            {/* Invoice Action Buttons */}
            <InvoiceActionButtons
              onPreview={handlePreview}
              onSaveAsDraft={handleSaveAsDraft}
              onSaveAndSend={handleSaveAndSend}
              onSaveAndSubmit={handleSaveAndSubmit}
              onUpdateAndApprove={handleUpdateAndApprove}
              onUpdate={handleUpdate}
              onSaveRecurring={handleSaveRecurring}
              hideSaveAsDraft={invoiceStatus === INVOICE_STATUS.SENT}
              saveAndSendLoading={saveAndSendLoading}
              isCloning={isCloning}
              invoiceId={invoiceId}
              invoiceStatus={invoiceStatus}
              userRole={userRole}
              organTypeCode={organTypeCode}
              isRecurring={isRecurring}
            />
          </Box>
        )}
      </CustomizedDialogs>

      <CustomizedDialogs
        open={showPreview}
        size="lg"
        viewOnly={true}
        footer={false}
        handleClose={handleClosePreview}
        submit={handleClosePreview}
        tittle="Invoice Preview"
      >
        <InvoicePreview data={previewData} />
        <InvoiceActionButtons
          onPreview={handleClosePreview}
          onSaveAsDraft={handleSaveAsDraft}
          onSaveAndSend={handleSaveAndSend}
          onSaveAndSubmit={handleSaveAndSubmit}
          onUpdateAndApprove={handleUpdateAndApprove}
          onUpdate={handleUpdate}
          onSaveRecurring={handleSaveRecurring}
          onGenerateLink={() => console.log("Generate Link clicked")}
          isPreview={true}
          hideSaveAsDraft={invoiceStatus === INVOICE_STATUS.SENT}
          saveAndSendLoading={saveAndSendLoading}
          users={users}
          invoiceStatus={invoiceStatus}
          userRole={userRole}
          organTypeCode={organTypeCode}
          isRecurring={isRecurring}
        />
      </CustomizedDialogs>

      <CustomizedDialogs
        tittle={"Terms & Conditions"}
        open={openTandC.isOpen}
        isButton={true}
        handleClose={() => setOpenTandC((prev) => ({ ...prev, isOpen: false }))}
        closeButtonName={"Close"}
      >
        <div>
          {openTandC?.termsData?.length > 0 ? (
            openTandC?.termsData?.map((term: any) => (
              <div key={term?.orgTermsAndConditionId} className="mb-4">
                <h3 className="font-bold text-lg mb-2">{term?.name}</h3>
                {term?.orgAdditionalTermsDto?.map((line: any) => (
                  <div key={line?.orgAdditionalTermsId} className="mb-2 ml-4">
                    <p className="font-semibold">{line?.additionalTerms}</p>
                    <p className="">{line?.value}</p>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <p>No terms and conditions available.</p>
          )}
        </div>
      </CustomizedDialogs>

      {/* AncillaryCharges Dialog: only show when requested */}
      {showAncillaryChargesDialog && (
        <AncillaryCharges
          forceAddMode={true}
          onClose={handleAncillaryChargesClose}
        />
      )}

      {/* Attachment Preview Dialog */}
      <CustomizedDialogs
        open={attachmentDialogOpen}
        size="md"
        footer={false}
        handleClose={() => setAttachmentDialogOpen(false)}
        submit={() => setAttachmentDialogOpen(false)}
        SubmitButtonColor="error"
        SubmitButtonName="Cancel"
        tittle={
          selectedAttachment?.attachmentDto?.fileName || "Attachment Preview"
        }
      >
        {selectedAttachment?.attachmentDto?.attachmentType?.startsWith(
          "image/"
        ) ? (
          <img
            src={`data:${selectedAttachment.attachmentDto.attachmentType};base64,${selectedAttachment.attachmentDto.fileContent}`}
            alt={selectedAttachment.attachmentDto.fileName}
            style={{
              maxWidth: "100%",
              maxHeight: 400,
              display: "block",
              margin: "0 auto",
            }}
          />
        ) : selectedAttachment?.attachmentDto?.attachmentType ===
          "application/pdf" ? (
          <iframe
            src={`data:application/pdf;base64,${selectedAttachment.attachmentDto.fileContent}`}
            title={selectedAttachment.attachmentDto.fileName}
            width="100%"
            height="400px"
          />
        ) : selectedAttachment?.attachmentDto?.fileContent ? (
          <a
            href={`data:${selectedAttachment.attachmentDto.attachmentType};base64,${selectedAttachment.attachmentDto.fileContent}`}
            download={selectedAttachment.attachmentDto.fileName}
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Download {selectedAttachment.attachmentDto.fileName}
          </a>
        ) : (
          <Typography>No preview available.</Typography>
        )}
      </CustomizedDialogs>

      {showAddOrgDialog && (
        <AddNewOrgBilledTo
          open={showAddOrgDialog}
          handleClose={() => setShowAddOrgDialog(false)}
        />
      )}
    </>
  );
};

export default Invoice;