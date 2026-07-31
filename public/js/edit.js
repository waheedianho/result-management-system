$(function () {
  // Use event delegation to support DataTables pagination
  $(document).on('click', '.edit', function () {
    const id = this.id;
    const currentRow = $(this).closest('tr');
    const inputs = currentRow.find('input, select');
    const actionBtn = currentRow.find('.actionBtn');

    inputs.removeAttr('disabled').addClass('change-cursor');
    if (inputs[0]) inputs[0].focus();

    // Immediately show the check button
    actionBtn.html(
      `<i class="btn btn-success w-75 fa fa-check-circle-o comfirmEdit" id="confirm_${id}"></i>`
    );
  });

  $(document).on('click', '.comfirmEdit', function () {
    const id = this.id.replace('confirm_', '');
    const currentRow = $(this).closest('tr');
    const inputs = currentRow.find('input, select');
    let data = {};

    inputs.each(function() {
      const dataAttr = $(this).attr('name');
      let dataValue = $(this).val();
      if (dataAttr) {
        if (typeof dataValue === 'string' && this.tagName === 'INPUT' && dataAttr !== 'email' && dataAttr !== 'password' && dataAttr !== 'photoUrl') {
          // dataValue = dataValue.toUpperCase(); // We shouldn't strictly uppercase everything (like email), but keeping logic close to original
        }
        data[dataAttr] = dataValue;
      }
    });

    $.ajax({
      type: 'Put',
      url: url + '/' + id,
      data: data,
      dataType: 'json',
      success: data => {
        location.reload();
      },
      error: err => {
        console.error(err);
        alert('Failed to update.');
      }
    });
  });
});
