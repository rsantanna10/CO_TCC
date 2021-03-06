import React from "react";
import { connect } from "react-redux";
import { CircularProgress, Dialog } from "@material-ui/core";
import { getAllDentistas, getDentistasByNome, getDentista, deleteDentista } from "../Api";
import HDataTable from "../HDataTable/HDataTable";
import { setMessage, setTela } from "../../actions";
import { mapDentistaToExcel, mapDentistaToPdf } from "../form-tcc/dataFormat";
import HDialog from "../HDataTable/HDialog";
import { toExcel, PdfDialog } from "../HDataTable/ExportToFile";

class TabelaDentistas extends React.Component {
  state = {
    dentistas: null,
    table_pageSize: 10,
    table_page: 1,
    table_orderBy: "nome",
    table_ascOrder: "asc",
    delDialogOpen: false,
    delDialogKey: null,
    pdfDialogKey: null,
    wait: false,
  };

  componentDidMount() {
    getAllDentistas(
      this.state.table_page,
      this.state.table_pageSize,
      this.state.table_orderBy + "-" + this.state.table_ascOrder,
      this.props.setToken,
      this.showDentistas,
      this.showError
    );
  }

  showDentistas = (res) => {
    if (!res || !res.data || !res.data.registros || res.data.registros.length === 0) {
      this.props.setMessage({ color: "warning", text: "Nenhum dentista encontrado" });
      return;
    }
    let ord = res.data.parametros.order ? res.data.parametros.order : "nome-asc";
    if (ord.slice(0, 3) === "cro") {
      ord = "nr_" + ord;
    }
    let i = ord.indexOf("-");
    this.setState({
      dentistas: res.data,
      table_page: res.data.parametros.page ? res.data.parametros.page : 1,
      table_pageSize: res.data.parametros.pagesize ? res.data.parametros.pagesize : 10,
      table_orderBy: ord.slice(0, i),
      table_ascOrder: ord.slice(i + 1),
    });
  };

  showError = (err) => {
    this.props.setMessage({ color: "warning", text: err });
  };

  getDentistaHeader = () => {
    return [
      {
        id: "nr_cro",
        numeric: false,
        disablePadding: false,
        label: "CRO",
        style: { width: 50, maxWidth: "10%" },
      },
      { id: "nome", numeric: false, disablePadding: false, label: "Nome" },
    ];
  };

  getTableActions = (entidade) => {
    let editar = {
      tooltip: "editar",
      call: this.table_onEditRegister,
      icon: "EDITAR",
    };
    let excluir = {
      tooltip: "excluir",
      call: this.table_onDeleteRegister,
      icon: "DELETAR",
    };
    let exportar = {
      tooltip: "PDF",
      call: this.table_onPDF,
      icon: "EXPORTAR",
    };
    return [editar, excluir, exportar];
  };

  formatarDadosTabela = () => {
    const den = this.state.dentistas;
    if (!den) {
      return null;
    }
    const rows = den.registros.map((d) => {
      return {
        key: d.id,
        view: [
          { value: d.nr_cro, align: "left" },
          { value: d.Pessoa.nome, align: "left" },
        ],
      };
    });
    return {
      headCells: this.getDentistaHeader(),
      rows: rows,
      total: den.total,
      page: this.state.table_page,
      pageSize: this.state.table_pageSize,
    };
  };

  table_onSearch = (event, key) => {
    getDentistasByNome(key, this.props.setToken, this.showDentistas, this.showError);
  };

  table_onSearchCancel = () => {
    getAllDentistas(
      this.state.table_page,
      this.state.table_pageSize,
      this.state.table_orderBy + (this.state.table_ascOrder ? "-asc" : "-desc"),
      this.props.setToken,
      this.showDentistas,
      this.showError
    );
  };

  alterKey = (key) => {
    return key === "nr_cro" ? "cro" : key;
  };

  table_onChangePage = (event, pageNumber) => {
    getAllDentistas(
      pageNumber + 1,
      this.state.table_pageSize,
      this.alterKey(this.state.table_orderBy) + "-" + this.state.table_ascOrder,
      this.props.setToken,
      this.showDentistas,
      this.showError
    );
  };

  table_onChangePageSize = (event) => {
    getAllDentistas(
      this.state.table_page,
      parseInt(event.target.value, 10),
      this.alterKey(this.state.table_orderBy) + "-" + this.state.table_ascOrder,
      this.props.setToken,
      this.showDentistas,
      this.showError
    );
  };

  table_onSort = (event, key) => {
    let asc =
      key === this.state.table_orderBy && this.state.table_ascOrder === "asc" ? "desc" : "asc";
    getAllDentistas(
      this.state.table_page,
      this.state.table_pageSize,
      this.alterKey(key) + "-" + asc,
      this.props.setToken,
      this.showDentistas,
      this.showError
    );
  };

  table_onCreateRegister = (event) => {
    this.props.setTela("CREATE_DENTISTA");
  };

  table_onEditRegister = (event, key) => {
    this.props.setTela("EDIT_DENTISTA:" + key);
  };

  table_onDeleteRegister = (event, key) => {
    this.setState({ delDialogOpen: true, delDialogKey: key });
  };

  table_onSelect = (event, key) => {
    this.props.setTela("VIEW_DENTISTA:" + key);
  };

  table_export = (event) => {
    getAllDentistas(
      1,
      10000,
      "nome-asc",
      this.props.setToken,
      this.table_exportCallback,
      this.table_exportError,
      this.props.perfil.id
    );
    this.setState({ wait: true });
  };

  table_exportCallback = (res) => {
    toExcel(
      res.data.registros,
      "dentistas",
      mapDentistaToExcel,
      () => this.setState({ wait: false }),
      (msg) => this.table_exportError(msg)
    );
  };

  table_exportError = (err) => {
    this.props.setMessage({ color: "warning", text: err });
    this.setState({ wait: false });
  };

  table_onPDF = (event, key) => {
    this.setState({ pdfDialogOpen: true, pdfDialogKey: key });
  };

  dialog_onConfirm = (event) => {
    deleteDentista(
      { id: this.state.delDialogKey, admin: this.props.perfil.id },
      this.props.setToken,
      this.onDeleteSuccess,
      this.showError
    );
  };

  onDeleteSuccess = () => {
    getAllDentistas(
      this.state.table_page,
      this.state.table_pageSize,
      this.state.table_orderBy + "-" + this.state.table_ascOrder,
      this.props.setToken,
      this.showDentistas,
      this.showError
    );
    this.setState({ delDialogOpen: false, delDialogKey: null });
    this.props.setMessage({ color: "primary", text: "Cadastro deletado!" });
  };

  getDentistaSelecionado = () => {
    return this.state.dentistas && this.state.delDialogKey
      ? this.state.dentistas.registros.filter((d) => d.id === this.state.delDialogKey)[0]
      : {};
  };

  renderDelDialogContent = () => {
    const data = this.getDentistaSelecionado();
    return (
      <div>
        A deleção do cadastro de um dentista é um procedimento irreversível e pode impactar na
        agenda de atendimentos. Deseja confirmar a deleção do cadastro do dentista
        <b>{" " + data.Pessoa.nome}</b> - CRO <b>{data.nr_cro}</b> ?
      </div>
    );
  };

  render() {
    return (
      <div>
        <Dialog
          fullScreen
          open={this.state.wait}
          PaperProps={{
            style: {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}
        />
        {this.state.wait && <CircularProgress />}
        {this.state.delDialogKey && (
          <HDialog
            title="Leia com atenção!"
            contentRender={this.renderDelDialogContent}
            open={this.state.delDialogOpen}
            onClose={(e) => this.setState({ delDialogOpen: false })}
            onPrimary={(e) => this.setState({ delDialogOpen: false })}
            primaryLabel="Cancelar"
            onSecondary={this.dialog_onConfirm}
            secondaryLabel="Deletar"
          />
        )}
        {this.state.pdfDialogKey && (
          <PdfDialog
            idEntidade={this.state.pdfDialogKey}
            idUser={this.props.perfil.id}
            token={this.props.setToken}
            getEntidade={getDentista}
            mapping={mapDentistaToPdf}
            fileName={"dentista_" + this.state.pdfDialogKey}
            onClose={() => this.setState({ pdfDialogKey: null })}
          />
        )}
        <HDataTable
          title="Dentistas"
          searchPlaceHolder="filtrar por nome..."
          onSearch={this.table_onSearch}
          onExport={this.table_export}
          dataExport={this.state.dataExport}
          onSearchCancel={this.table_onSearchCancel}
          data={this.formatarDadosTabela()}
          onSelect={this.table_onSelect}
          onChangePage={this.table_onChangePage}
          onChangePageSize={this.table_onChangePageSize}
          onSort={this.table_onSort}
          onCreateRegister={this.table_onCreateRegister}
          orderBy={this.state.table_orderBy}
          ascOrder={this.state.table_ascOrder}
          actions={this.getTableActions("dentista")}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    setToken: state.setToken,
    message: state.message,
    tela: state.tela,
    perfil: state.perfil,
  };
};

export default connect(mapStateToProps, { setMessage, setTela })(TabelaDentistas);
